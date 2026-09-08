import { randomUUID, timingSafeEqual } from "node:crypto";
import { NextRequest } from "next/server";
import { saveDecision } from "@/src/memory/memory-api";
import type { Decision } from "@/src/memory/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

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
      item.timestamp &&
      item.council_version,
  );
}

function createDecisionId() {
  return `ADB-${randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`;
}

function decisionTitle(question: string) {
  const lines = question
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const topicLine = lines.find((line) => line.startsWith("موضوع النقاش:"));
  const raw = topicLine?.slice("موضوع النقاش:".length).trim() || lines[0] || "قرار مجلس Amir Dev Brain";
  return raw.slice(0, 180);
}

function modelContext(decision: CouncilDecision) {
  return [
    `council:${decision.council_version}`,
    decision.model ? `models:${decision.model}` : "",
    `conflict_flags:${decision.conflict_flags?.length ?? 0}`,
  ].filter(Boolean);
}

export async function POST(req: NextRequest) {
  const expectedKey = normalizeKey(
    process.env.COUNCIL_APPROVE_KEY || process.env.MCP_ACCESS_KEY || "",
  );
  if (!expectedKey) {
    console.error("[council/approve] approval key is not configured");
    return Response.json(
      { ok: false, error: "approval_key_not_configured" },
      { status: 503 },
    );
  }

  const providedKey = normalizeKey(
    req.headers.get("x-brain-key") || req.headers.get("authorization") || "",
  );
  if (!providedKey || !secureKeyMatch(providedKey, expectedKey)) {
    return Response.json({ ok: false, error: "approval_auth_failed" }, { status: 401 });
  }

  let body: { decision?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (!validDecision(body.decision)) {
    return Response.json(
      { ok: false, error: "invalid_council_decision" },
      { status: 400 },
    );
  }

  const councilDecision = body.decision;
  const now = new Date().toISOString();
  const decision: Decision = {
    id: createDecisionId(),
    project: councilDecision.project.trim(),
    title: decisionTitle(councilDecision.question),
    question: councilDecision.question,
    synthesis: councilDecision.synthesis,
    state: "ACTIVE",
    approvedBy: "amir_owner",
    approvedAt: now,
    createdAt: now,
    updatedAt: now,
    councilVersion: councilDecision.council_version,
    modelContext: modelContext(councilDecision),
    versionBindings: [],
    evidenceLinks: [],
    reviewPolicy: {
      reviewAfter: null,
      maxAgeDays: 90,
      triggers: ["manual_review"],
    },
    supersedes: null,
    vectorStatus: "PENDING",
  };

  try {
    const stored = await saveDecision(decision);
    return Response.json(
      {
        ok: true,
        persisted: true,
        decision_id: stored.id,
        decision_state: stored.state,
        vector_status: stored.vectorStatus,
        indexed: stored.vectorStatus === "INDEXED",
        persistence_mode: "postgres_ssot_qdrant_index",
        approved_at: stored.approvedAt,
      },
      { status: 200 },
    );
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    console.error("[council/approve] Memory API persistence failed", { message });
    return Response.json(
      { ok: false, error: "decision_persist_failed" },
      { status: 500 },
    );
  }
}
