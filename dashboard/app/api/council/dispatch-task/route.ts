import { timingSafeEqual } from "node:crypto";
import { NextRequest } from "next/server";
import {
  dispatchImplementationTask,
  type DispatchTaskInput,
} from "@/src/memory/task-dispatcher";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

function normalizeKey(raw: string) {
  let value = raw.trim();
  value = value.replace(/^(?:MCP_ACCESS_KEY|COUNCIL_APPROVE_KEY)\s*=\s*/i, "").trim();
  value = value.replace(/^Bearer\s+/i, "").trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1).trim();
  }
  return value;
}

function secureKeyMatch(provided: string, expected: string) {
  const providedBytes = Buffer.from(provided, "utf8");
  const expectedBytes = Buffer.from(expected, "utf8");
  return (
    providedBytes.length === expectedBytes.length &&
    timingSafeEqual(providedBytes, expectedBytes)
  );
}

function validBody(value: unknown): value is DispatchTaskInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Partial<DispatchTaskInput>;
  return Boolean(
    typeof candidate.decision_id === "string" &&
      candidate.decision_id.trim() &&
      typeof candidate.repository === "string" &&
      candidate.repository.trim() &&
      typeof candidate.base_ref === "string" &&
      candidate.base_ref.trim() &&
      candidate.scope_config &&
      typeof candidate.scope_config === "object" &&
      !Array.isArray(candidate.scope_config),
  );
}

function statusForError(message: string) {
  if (message === "decision_not_found") return 404;
  if (message === "repository_not_allowed") return 403;
  if (message === "decision_not_active" || message === "decision_not_indexed") return 409;
  if (
    message.startsWith("invalid_") ||
    message.startsWith("unsafe_scope_") ||
    message === "decision_id_required"
  ) {
    return 400;
  }
  if (
    message.endsWith("_missing") ||
    message.startsWith("github_app_") ||
    message === "adb_allowed_repositories_missing"
  ) {
    return 503;
  }
  if (message.startsWith("github_")) return 502;
  return 500;
}

export async function POST(req: NextRequest) {
  const expectedKey = normalizeKey(
    process.env.COUNCIL_APPROVE_KEY || process.env.MCP_ACCESS_KEY || "",
  );
  if (!expectedKey) {
    console.error("[council/dispatch-task] owner key is not configured");
    return Response.json(
      { ok: false, error: "approval_key_not_configured" },
      { status: 503 },
    );
  }

  const providedKey = normalizeKey(
    req.headers.get("x-brain-key") || req.headers.get("authorization") || "",
  );
  if (!providedKey || !secureKeyMatch(providedKey, expectedKey)) {
    return Response.json({ ok: false, error: "dispatch_auth_failed" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (!validBody(body)) {
    return Response.json({ ok: false, error: "invalid_dispatch_request" }, { status: 400 });
  }

  try {
    const result = await dispatchImplementationTask(body);
    return Response.json(
      {
        ok: true,
        task_id: result.task.task_id,
        status: result.task.status,
        decision_id: result.task.decision_id,
        decision_revision: result.task.decision_revision,
        decision_sha256: result.task.decision_sha256,
        repository: result.task.repository,
        base_ref: result.task.base_ref,
        deduplicated: result.deduplicated,
      },
      { status: result.deduplicated ? 200 : 202 },
    );
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    const status = statusForError(message);
    console.error("[council/dispatch-task] dispatch failed", {
      error: message,
      status,
    });

    return Response.json(
      {
        ok: false,
        error: status >= 500 ? "dispatch_failed" : message,
      },
      { status },
    );
  }
}
