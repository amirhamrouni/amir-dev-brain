import { NextRequest } from "next/server";
import { authenticateExecutor } from "@/src/memory/executor-auth";
import { getExecutionTaskSpec } from "@/src/memory/task-executor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

type RouteContext = {
  params: Promise<{ taskId: string }>;
};

function statusForError(message: string) {
  if (message === "implementation_task_not_found" || message === "decision_not_found") return 404;
  if (
    message === "implementation_task_terminal" ||
    message === "implementation_task_not_dispatchable" ||
    message === "decision_snapshot_mismatch" ||
    message === "decision_no_longer_active" ||
    message === "unsupported_decision_revision"
  ) {
    return 409;
  }
  if (message.startsWith("invalid_scope_") || message.startsWith("unsafe_scope_") || message === "task_id_required") {
    return 400;
  }
  return 500;
}

export async function GET(req: NextRequest, context: RouteContext) {
  const auth = authenticateExecutor(req);
  if (!auth.ok) return auth.response;

  const { taskId } = await context.params;

  try {
    const spec = await getExecutionTaskSpec(taskId);
    return Response.json(
      {
        ok: true,
        task: spec.task,
        decision: spec.decision,
      },
      {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    const status = statusForError(message);
    console.error("[council/tasks] task-spec read failed", { taskId, error: message, status });
    return Response.json(
      { ok: false, error: status >= 500 ? "task_spec_failed" : message },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  }
}
