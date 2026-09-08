import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 20;

const MCP_URL = "https://hdcpvwsndxxflbednvsq.supabase.co/functions/v1/open-brain-mcp";
const MCP_PROTOCOL_VERSION = "2025-03-26";

type CouncilDecision = {
  project: string;
  question: string;
  responses: {
    architect: string;
    critic: string;
    engineer: string;
    judge: string;
  };
  conflict_flags: string[];
  synthesis: string;
  timestamp: string;
  status: "pending_approval" | "approved";
  council_version: string;
  model?: string;
};

type JsonRpcFrame = {
  error?: unknown;
  result?: {
    isError?: boolean;
    content?: Array<{ type?: string; text?: string }>;
  };
};

function normalizeKey(raw: string) {
  let value = raw.trim();
  value = value.replace(/^MCP_ACCESS_KEY\s*=\s*/i, "").trim();
  value = value.replace(/^Bearer\s+/i, "").trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1).trim();
  }
  return value;
}

function validDecision(value: unknown): value is CouncilDecision {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<CouncilDecision>;
  return Boolean(
    item.project &&
      item.question &&
      item.responses &&
      typeof item.responses.architect === "string" &&
      typeof item.responses.critic === "string" &&
      typeof item.responses.engineer === "string" &&
      typeof item.responses.judge === "string" &&
      typeof item.synthesis === "string" &&
      item.synthesis.trim() &&
      item.timestamp,
  );
}

function parseMcpFrames(raw: string): JsonRpcFrame[] {
  const frames: JsonRpcFrame[] = [];
  const candidates = [raw.trim()];

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.startsWith("data:")) candidates.push(trimmed.slice(5).trim());
  }

  for (const candidate of candidates) {
    if (!candidate || candidate === "[DONE]") continue;
    try {
      const parsed = JSON.parse(candidate) as JsonRpcFrame;
      if (parsed && typeof parsed === "object") frames.push(parsed);
    } catch {
      // Ignore non-JSON SSE framing lines.
    }
  }

  return frames;
}

function mcpFailure(frames: JsonRpcFrame[]) {
  return frames.find((frame) => frame.error || frame.result?.isError === true);
}

function persistedThoughtId(frames: JsonRpcFrame[]) {
  for (const frame of frames) {
    for (const item of frame.result?.content || []) {
      if (item.type !== "text" || !item.text) continue;
      try {
        const parsed = JSON.parse(item.text) as { thought_id?: string | null };
        if (parsed.thought_id) return parsed.thought_id;
      } catch {
        // The MCP tool may return human-readable text; that is still a valid success.
      }
    }
  }
  return null;
}

function safeDetail(raw: string) {
  return raw.replace(/\s+/g, " ").slice(0, 500);
}

export async function POST(req: NextRequest) {
  const key = normalizeKey(req.headers.get("x-brain-key") || req.headers.get("authorization") || "");
  if (!key) return Response.json({ ok: false, error: "missing_access_key" }, { status: 401 });

  let body: { decision?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (!validDecision(body.decision)) {
    return Response.json({ ok: false, error: "invalid_council_decision" }, { status: 400 });
  }

  const decision = body.decision;
  let response: Response;

  try {
    response = await fetch(MCP_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
        "x-brain-key": key,
        "mcp-protocol-version": MCP_PROTOCOL_VERSION,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: crypto.randomUUID(),
        method: "tools/call",
        params: {
          name: "capture_council_decision",
          arguments: {
            project: decision.project,
            question: decision.question,
            synthesis: decision.synthesis,
            timestamp: decision.timestamp,
            council_version: decision.council_version,
            model: decision.model,
            conflict_flags: decision.conflict_flags || [],
          },
        },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    console.error("[council/approve] Open Brain request failed", { message });
    return Response.json(
      { ok: false, error: "open_brain_unreachable" },
      { status: 502 },
    );
  }

  const raw = await response.text();
  const frames = parseMcpFrames(raw);
  const failure = mcpFailure(frames);

  if (!response.ok || failure || frames.length === 0) {
    console.error("[council/approve] Open Brain persistence failed", {
      status: response.status,
      rpc_error: Boolean(failure),
      detail: safeDetail(raw),
    });
    return Response.json(
      {
        ok: false,
        error: /unauthorized|auth_key_mismatch/i.test(raw) ? "open_brain_auth_failed" : "open_brain_persist_failed",
      },
      { status: response.status >= 400 ? response.status : 502 },
    );
  }

  return Response.json(
    {
      ok: true,
      persisted: true,
      thought_id: persistedThoughtId(frames),
      persistence_mode: "deterministic_no_generation",
      generated_at: decision.timestamp,
    },
    { status: 200 },
  );
}
