import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { getDecisionById } from "./decision-repository";
import {
  assertRepositoryAllowed,
  sendImplementationRepositoryDispatch,
} from "./github-app";
import {
  asValidatedTask,
  createImplementationTask,
  getTaskByIdempotencyKey,
  updateTaskStatus,
} from "./task-repository";
import type { Decision } from "./types";
import type { ScopeConfig, StoredScopeConfig, Task } from "./task-types";

export type DispatchTaskInput = {
  decision_id: string;
  repository: string;
  base_ref: string;
  scope_config: unknown;
};

export type DispatchTaskResult = {
  task: Task;
  deduplicated: boolean;
};

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonicalize(item)]),
    );
  }
  return value;
}

function canonicalJson(value: unknown) {
  return JSON.stringify(canonicalize(value));
}

function sha256(value: unknown) {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function normalizedStrings(value: unknown, field: string, requireItem: boolean) {
  if (!Array.isArray(value)) throw new Error(`invalid_scope_${field}`);

  const normalized = [
    ...new Set(
      value.map((item) => {
        if (typeof item !== "string" || !item.trim()) {
          throw new Error(`invalid_scope_${field}`);
        }
        return item.trim();
      }),
    ),
  ].sort();

  if (requireItem && normalized.length === 0) {
    throw new Error(`invalid_scope_${field}`);
  }
  return normalized;
}

function assertSafePathPattern(value: string, field: string) {
  if (
    value.includes("\0") ||
    value.includes("\\") ||
    value.startsWith("/") ||
    value.split("/").includes("..")
  ) {
    throw new Error(`unsafe_scope_${field}`);
  }
}

function positiveInteger(value: unknown, field: string) {
  if (!Number.isInteger(value) || Number(value) <= 0) {
    throw new Error(`invalid_scope_${field}`);
  }
  return Number(value);
}

export function validateScopeConfig(value: unknown): ScopeConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("invalid_scope_config");
  }

  const candidate = value as Partial<ScopeConfig>;
  const allowed_paths = normalizedStrings(candidate.allowed_paths, "allowed_paths", true);
  const denied_paths = normalizedStrings(candidate.denied_paths, "denied_paths", false);
  const forbidden_patterns = normalizedStrings(
    candidate.forbidden_patterns,
    "forbidden_patterns",
    false,
  );

  for (const item of [...allowed_paths, ...denied_paths]) {
    assertSafePathPattern(item, "path");
  }

  return {
    allowed_paths,
    denied_paths,
    forbidden_patterns,
    max_files_changed: positiveInteger(candidate.max_files_changed, "max_files_changed"),
    max_changed_lines: positiveInteger(candidate.max_changed_lines, "max_changed_lines"),
  };
}

function validateStoredScope(scope: StoredScopeConfig) {
  return validateScopeConfig(scope);
}

function normalizedDecisionForHash(decision: Decision) {
  return {
    id: decision.id,
    project: decision.project,
    title: decision.title,
    question: decision.question ?? null,
    synthesis: decision.synthesis,
    state: decision.state,
    approvedBy: decision.approvedBy,
    approvedAt: decision.approvedAt,
    councilVersion: decision.councilVersion ?? null,
    modelContext: decision.modelContext,
    versionBindings: decision.versionBindings,
    reviewPolicy: decision.reviewPolicy,
    supersedes: decision.supersedes ?? null,
  };
}

export function decisionSnapshotSha256(decision: Decision) {
  return sha256(normalizedDecisionForHash(decision));
}

function validateBaseRef(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!/^[0-9a-f]{40}$/.test(normalized)) {
    throw new Error("invalid_base_ref");
  }
  return normalized;
}

async function existingTaskResult(idempotencyKey: string): Promise<DispatchTaskResult | null> {
  const existing = await getTaskByIdempotencyKey(idempotencyKey);
  if (!existing) return null;

  const scope = validateStoredScope(existing.scope_config);
  return {
    task: asValidatedTask(existing, scope),
    deduplicated: true,
  };
}

export async function dispatchImplementationTask(
  input: DispatchTaskInput,
): Promise<DispatchTaskResult> {
  const decisionId = input.decision_id?.trim();
  if (!decisionId) throw new Error("decision_id_required");

  const repository = assertRepositoryAllowed(input.repository || "");
  const baseRef = validateBaseRef(input.base_ref || "");
  const scope = validateScopeConfig(input.scope_config);

  const decision = await getDecisionById(decisionId);
  if (!decision) throw new Error("decision_not_found");
  if (decision.state !== "ACTIVE") throw new Error("decision_not_active");
  if (decision.vectorStatus !== "INDEXED") throw new Error("decision_not_indexed");

  // V1 decisions currently have no immutable revision table. Revision 1 therefore
  // means "the authoritative decision snapshot hashed at dispatch time".
  const decisionRevision = 1;
  const decisionSha256 = decisionSnapshotSha256(decision);
  const idempotencyKey = `adb:${sha256({
    decision_id: decisionId,
    decision_revision: decisionRevision,
    decision_sha256: decisionSha256,
    repository,
    base_ref: baseRef,
    scope_config: scope,
  })}`;

  const duplicate = await existingTaskResult(idempotencyKey);
  if (duplicate) return duplicate;

  const taskId = `task_${randomUUID()}`;

  try {
    await createImplementationTask({
      task_id: taskId,
      decision_id: decisionId,
      decision_revision: decisionRevision,
      decision_sha256: decisionSha256,
      repository,
      base_ref: baseRef,
      scope_config: scope,
      idempotency_key: idempotencyKey,
    });
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      const racedDuplicate = await existingTaskResult(idempotencyKey);
      if (racedDuplicate) return racedDuplicate;
    }
    throw error;
  }

  try {
    await sendImplementationRepositoryDispatch(repository, {
      task_id: taskId,
      decision_id: decisionId,
      decision_revision: decisionRevision,
      decision_sha256: decisionSha256,
      base_ref: baseRef,
    });

    const dispatched = await updateTaskStatus(taskId, "DISPATCHED");
    return {
      task: asValidatedTask(dispatched, scope),
      deduplicated: false,
    };
  } catch (error) {
    await updateTaskStatus(taskId, "FAILED").catch(() => undefined);
    throw error;
  }
}
