import { NextRequest } from "next/server";
import { authenticateExecutor } from "@/src/memory/executor-auth";
import {
  transitionExecutionTask,
  type ExecutorTransitionInput,
} from "@/src/memory/task-executor";
import { TASK_STATUSES, type TaskStatus } from "@/src/memory/task-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

type RouteContext = {
  params: Promise<{ taskId: string }>;
};

function isTaskStatus(value: unknown): value is TaskStatus {
  return typeof value === "string" && (TASK_STATUSES as readonly string[]).includes(value);
}

function validBody(value: unknown): value is ExecutorTransitionInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Partial<ExecutorTransitionInput>;
  return (
    isTaskStatus(candidate.status) &&
    (candidate.branch_name == null || typeof candidate.branch_name === "string") &&
    (candidate.pr_number == null || typeof candidate.pr_number === "number") &&
    (candidate.pr_url == null || typeof candidate.pr_url === "string")
  );
}

function statusForError(message: string) {
  if (message === "implementation_task_not_found") return 404;
  if (
    message.startsWith("invalid_task_transition:") ||
    message === "implementation_task_transition_conflict"
  ) {
    return 409;
  }
  if (
    message.startsWith("invalid_") ||
    message.endsWith("_required") ||
    message.startsWith("unsafe_scope_")
  ) {
    return 400;
  }
  return 500;
}

export async function POST(req: NextRequest, context: RouteContext) {
  const auth = authenticateExecutor(req);
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (!validBody(body)) {
    return Response.json({ ok: false, error: "invalid_transition_request" }, { status: 400 });
  }

  const { taskId } = await context.params;

  try {
    const task = await transitionExecutionTask(taskId, body);
    return Response.json(
      {
        ok: true,
        task_id: task.task_id,
        status: task.status,
        branch_name: task.branch_name,
        pr_number: task.pr_number,
        pr_url: task.pr_url,
        updated_at: task.updated_at,
      },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    const status = statusForError(message);
    console.error("[council/tasks/status] transition failed", {
      taskId,
      requestedStatus: body.status,
      error: message,
      status,
    });
    return Response.json(
      { ok: false, error: status >= 500 ? "task_transition_failed" : message },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  }
}
