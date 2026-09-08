export const TASK_STATUSES = [
  "READY",
  "QUEUED",
  "DISPATCHED",
  "RUNNING",
  "CODING",
  "VERIFYING",
  "PR_CREATING",
  "PR_READY",
  "FAILED",
  "POLICY_BLOCKED",
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

/**
 * Valid execution scope consumed by the dispatcher and hardened scope guard.
 * The dispatcher must fail closed when the stored scope is empty or does not
 * satisfy this contract.
 */
export interface ScopeConfig {
  allowed_paths: string[];
  denied_paths: string[];
  forbidden_patterns: string[];
  max_files_changed: number;
  max_changed_lines: number;
}

/**
 * SQL permits an empty object as the storage default before a task becomes
 * dispatchable. Runtime code must validate and narrow this to ScopeConfig
 * before execution.
 */
export type StoredScopeConfig = ScopeConfig | Record<string, never>;

/**
 * Strict, validated implementation task contract used by execution code.
 * Property names intentionally mirror the SQL schema.
 */
export interface Task {
  task_id: string;
  decision_id: string;
  decision_revision: number;
  decision_sha256: string;
  status: TaskStatus;
  repository: string;
  base_ref: string;
  branch_name: string | null;
  pr_number: number | null;
  pr_url: string | null;
  scope_config: ScopeConfig;
  idempotency_key: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Row shape returned directly from PostgreSQL before fail-closed scope
 * validation. This exists because scope_config defaults to '{}' in SQL.
 */
export interface StoredTaskRow extends Omit<Task, "scope_config"> {
  scope_config: StoredScopeConfig;
}

export type ImplementationTask = Task;
