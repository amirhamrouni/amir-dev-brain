import "server-only";

import type { QueryResultRow } from "pg";
import { getPostgresPool } from "./postgres";
import type {
  ScopeConfig,
  StoredTaskRow,
  Task,
  TaskStatus,
} from "./task-types";

type TaskRow = QueryResultRow & {
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
  scope_config: unknown;
  idempotency_key: string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

export type CreateImplementationTaskInput = {
  task_id: string;
  decision_id: string;
  decision_revision: number;
  decision_sha256: string;
  repository: string;
  base_ref: string;
  scope_config: ScopeConfig;
  idempotency_key: string;
};

export type TaskExecutionMetadata = {
  branch_name?: string | null;
  pr_number?: number | null;
  pr_url?: string | null;
};

function toIso(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mapStoredTaskRow(row: TaskRow): StoredTaskRow {
  return {
    task_id: row.task_id,
    decision_id: row.decision_id,
    decision_revision: row.decision_revision,
    decision_sha256: row.decision_sha256,
    status: row.status,
    repository: row.repository,
    base_ref: row.base_ref,
    branch_name: row.branch_name,
    pr_number: row.pr_number,
    pr_url: row.pr_url,
    scope_config:
      row.scope_config && typeof row.scope_config === "object" && !Array.isArray(row.scope_config)
        ? (row.scope_config as StoredTaskRow["scope_config"])
        : {},
    idempotency_key: row.idempotency_key,
    created_at: toIso(row.created_at),
    updated_at: toIso(row.updated_at),
  };
}

export async function getTaskById(taskId: string): Promise<StoredTaskRow | null> {
  const result = await getPostgresPool().query<TaskRow>(
    `select * from public.implementation_tasks where task_id = $1 limit 1`,
    [taskId],
  );
  return result.rows[0] ? mapStoredTaskRow(result.rows[0]) : null;
}

export async function getTaskByIdempotencyKey(
  idempotencyKey: string,
): Promise<StoredTaskRow | null> {
  const result = await getPostgresPool().query<TaskRow>(
    `select * from public.implementation_tasks where idempotency_key = $1 limit 1`,
    [idempotencyKey],
  );
  return result.rows[0] ? mapStoredTaskRow(result.rows[0]) : null;
}

export async function createImplementationTask(
  input: CreateImplementationTaskInput,
): Promise<StoredTaskRow> {
  const result = await getPostgresPool().query<TaskRow>(
    `
      insert into public.implementation_tasks (
        task_id,
        decision_id,
        decision_revision,
        decision_sha256,
        status,
        repository,
        base_ref,
        scope_config,
        idempotency_key
      )
      values ($1, $2, $3, $4, 'QUEUED', $5, $6, $7::jsonb, $8)
      returning *
    `,
    [
      input.task_id,
      input.decision_id,
      input.decision_revision,
      input.decision_sha256,
      input.repository,
      input.base_ref,
      JSON.stringify(input.scope_config),
      input.idempotency_key,
    ],
  );

  const row = result.rows[0];
  if (!row) throw new Error("implementation_task_insert_failed");
  return mapStoredTaskRow(row);
}

export async function updateTaskStatus(
  taskId: string,
  status: TaskStatus,
): Promise<StoredTaskRow> {
  const result = await getPostgresPool().query<TaskRow>(
    `
      update public.implementation_tasks
      set status = $2
      where task_id = $1
      returning *
    `,
    [taskId, status],
  );

  const row = result.rows[0];
  if (!row) throw new Error("implementation_task_not_found");
  return mapStoredTaskRow(row);
}

export async function updateTaskExecutionState(
  taskId: string,
  expectedStatus: TaskStatus,
  nextStatus: TaskStatus,
  metadata: TaskExecutionMetadata = {},
): Promise<StoredTaskRow> {
  const result = await getPostgresPool().query<TaskRow>(
    `
      update public.implementation_tasks
      set
        status = $3,
        branch_name = coalesce($4, branch_name),
        pr_number = coalesce($5, pr_number),
        pr_url = coalesce($6, pr_url)
      where task_id = $1 and status = $2
      returning *
    `,
    [
      taskId,
      expectedStatus,
      nextStatus,
      metadata.branch_name ?? null,
      metadata.pr_number ?? null,
      metadata.pr_url ?? null,
    ],
  );

  const row = result.rows[0];
  if (!row) throw new Error("implementation_task_transition_conflict");
  return mapStoredTaskRow(row);
}

export function asValidatedTask(row: StoredTaskRow, scope: ScopeConfig): Task {
  return { ...row, scope_config: scope };
}
