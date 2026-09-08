import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 20;

const MCP_URL = "https://hdcpvwsndxxflbednvsq.supabase.co/functions/v1/open-brain-mcp";

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
      item.timestamp,
  );
}

function decisionAsMemory(decision: CouncilDecision) {
  const approved = { ...decision, status: "approved" as const, approved_at: new Date().toISOString() };
  return [
    "# Approved Council Lite Decision",
    `Project: ${approved.project}`,
    `Council version: ${approved.council_version}`,
    `Model: ${approved.model || "Gemini"}`,
    `Generated at: ${approved.timestamp}`,
    `Approved at: ${approved.approved_at}`,
    "Status: approved by Amir",
    "",
    "## Question",
    approved.question,
    "",
    "## Architect",
    approved.responses.architect,
    "",
    "## Critic",
    approved.responses.critic,
    "",
    "## Engineer",
    approved.responses.engineer,
    "",
    "## Judge / Synthesis",
    approved.synthesis,
    "",
    "## Conflict Flags",
    approved.conflict_flags?.length ? approved.conflict_flags.map((flag) => `- ${flag}`).join("\n") : "- None",
    "",
    "## Structured CouncilDecision",
    "```json",
    JSON.stringify(approved, null, 2),
    "```",
  ].join("\n");
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

  const response = await fetch(MCP_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      "x-brain-key": key,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: crypto.randomUUID(),
      method: "tools/call",
      params: {
        name: "capture_thought",
        arguments: {
          content: decisionAsMemory(body.decision),
        },
      },
    }),
    cache: "no-store",
  });

  const raw = await response.text();
  if (!response.ok || /unauthorized|auth_key_mismatch|"isError"\s*:\s*true/i.test(raw)) {
    return Response.json(
      { ok: false, error: "open_brain_persist_failed", detail: raw.slice(0, 600) },
      { status: response.status >= 400 ? response.status : 502 },
    );
  }

  return Response.json({ ok: true, persisted: true }, { status: 200 });
}
