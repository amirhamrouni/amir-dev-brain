import "server-only";

import { getDecisionById } from "./decision-repository";
import {
  decisionSnapshotSha256,
  validateScopeConfig,
} from "./task-dispatcher";
import {
  asValidatedTask,
  getTaskById,
  updateTaskExecutionState,
  type TaskExecutionMetadata,
} from "./task-repository";
import type { Decision } from "./types";
import type { Task, TaskStatus } from "./task-types";

const EXECUTOR_RUNNABLE_STATUSES = new Set<TaskStatus>([
  "DISPATCHED",
  "RUNNING",
  "CODING",
  "VERIFYING",
  "PR_CREATING",
]);

const TERMINAL_STATUSES = new Set<TaskStatus>([
  "PR_READY",
  "FAILED",
  "POLICY_BLOCKED",
]);

const ALLOWED_TRANSITIONS: Record<TaskStatus, ReadonlySet<TaskStatus>> = {
  READY: new Set(),
  QUEUED: new Set(),
  DISPATCHED: new Set(["RUNNING", "FAILED", "POLICY_BLOCKED"]),
  RUNNING: new Set(["CODING", "FAILED", "POLICY_BLOCKED"]),
  CODING: new Set(["VERIFYING", "FAILED", "POLICY_BLOCKED"]),
  VERIFYING: new Set(["PR_CREATING", "FAILED", "POLICY_BLOCKED"]),
  PR_CREATING: new Set(["PR_READY", "FAILED", "POLICY_BLOCKED"]),
  PR_READY: new Set(),
  FAILED: new Set(),
  POLICY_BLOCKED: new Set(),
};

export type ExecutionDecision = Pick<
  Decision,
  | "id"
  | "project"
  | "title"
  | "question"
  | "synthesis"
  | "approvedBy"
  | "approvedAt"
  | "councilVersion"
  | "modelContext"
  | "versionBindings"
  | "reviewPolicy"
  | "supersedes"
>;

export type ExecutionTaskSpec = {
  task: Task;
  decision: ExecutionDecision;
};

export type ExecutorTransitionInput = {
  status: TaskStatus;
  branch_name?: string | null;
  pr_number?: number | null;
  pr_url?: string | null;
};

function executionDecision(decision: Decision): ExecutionDecision {
  return {
    id: decision.id,
    project: decision.project,
    title: decision.title,
    question: decision.question,
    synthesis: decision.synthesis,
    approvedBy: decision.approvedBy,
    approvedAt: decision.approvedAt,
    councilVersion: decision.councilVersion,
    modelContext: decision.modelContext,
    versionBindings: decision.versionBindings,
    reviewPolicy: decision.reviewPolicy,
    supersedes: decision.supersedes,
  };
}

function normalizeBranchName(value: string | null | undefined) {
  if (value == null) return null;
  const normalized = value.trim();
  if (
    !normalized ||
    normalized.length > 240 ||
    normalized.startsWith("-") ||
    normalized.endsWith(".") ||
    normalized.includes("..") ||
    normalized.includes("@{") ||
    /[\s~^:?*\\[\]\u0000-\u001f\u007f]/.test(normalized)
  ) {
    throw new Error("invalid_branch_name");
  }
  return normalized;
}

function normalizePrNumber(value: number | null | undefined) {
  if (value == null) return null;
  if (!Number.isInteger(value) || value <= 0) throw new Error("invalid_pr_number");
  return value;
}

function normalizePrUrl(value: string | null | undefined, repository: string, prNumber: number | null) {
  if (value == null) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("invalid_pr_url");
  }

  if (url.protocol !== "https:" || url.hostname !== "github.com") {
    throw new Error("invalid_pr_url");
  }

  const expectedPrefix = `/${repository}/pull/`;
  if (!url.pathname.startsWith(expectedPrefix)) throw new Error("invalid_pr_url");

  if (prNumber != null && url.pathname !== `${expectedPrefix}${prNumber}`) {
    throw new Error("invalid_pr_url");
  }

  return url.toString();
}

function normalizeTransitionMetadata(
  input: ExecutorTransitionInput,
  task: Task,
): TaskExecutionMetadata {
  const branchName = normalizeBranchName(input.branch_name);
  const prNumber = normalizePrNumber(input.pr_number);
  const prUrl = normalizePrUrl(input.pr_url, task.repository, prNumber);

  if (input.status === "PR_CREATING" && !branchName && !task.branch_name) {
    throw new Error("branch_name_required");
  }

  if (input.status === "PR_READY") {
    if (!branchName && !task.branch_name) throw new Error("branch_name_required");
    if (!prNumber && !task.pr_number) throw new Error("pr_number_required");
    if (!prUrl && !task.pr_url) throw new Error("pr_url_required");
  }

  return {
    branch_name: branchName,
    pr_number: prNumber,
    pr_url: prUrl,
  };
}

export async function getExecutionTaskSpec(taskId: string): Promise<ExecutionTaskSpec> {
  const normalizedTaskId = taskId.trim();
  if (!normalizedTaskId) throw new Error("task_id_required");

  const stored = await getTaskById(normalizedTaskId);
  if (!stored) throw new Error("implementation_task_not_found");

  const scope = validateScopeConfig(stored.scope_config);
  const task = asValidatedTask(stored, scope);
  if (!EXECUTOR_RUNNABLE_STATUSES.has(task.status)) {
    if (TERMINAL_STATUSES.has(task.status)) throw new Error("implementation_task_terminal");
    throw new Error("implementation_task_not_dispatchable");
  }

  const decision = await getDecisionById(task.decision_id);
  if (!decision) throw new Error("decision_not_found");
  if (task.decision_revision !== 1) throw new Error("unsupported_decision_revision");
  if (decisionSnapshotSha256(decision) !== task.decision_sha256) {
    throw new Error("decision_snapshot_mismatch");
  }
  if (decision.state !== "ACTIVE") throw new Error("decision_no_longer_active");

  return {
    task,
    decision: executionDecision(decision),
  };
}

export async function transitionExecutionTask(
  taskId: string,
  input: ExecutorTransitionInput,
): Promise<Task> {
  const stored = await getTaskById(taskId.trim());
  if (!stored) throw new Error("implementation_task_not_found");

  const scope = validateScopeConfig(stored.scope_config);
  const current = asValidatedTask(stored, scope);
  const nextStatus = input.status;

  if (current.status === nextStatus) {
    return current;
  }

  if (!ALLOWED_TRANSITIONS[current.status].has(nextStatus)) {
    throw new Error(`invalid_task_transition:${current.status}:${nextStatus}`);
  }

  const metadata = normalizeTransitionMetadata(input, current);
  const updated = await updateTaskExecutionState(
    current.task_id,
    current.status,
    nextStatus,
    metadata,
  );
  return asValidatedTask(updated, scope);
}
