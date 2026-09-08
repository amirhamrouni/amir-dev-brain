import { createHash } from "node:crypto";
import { NextRequest } from "next/server";
import {
  getDecisionById,
  getDecisionsByIds,
} from "@/src/memory/decision-repository";
import { saveDecision, searchDecisions } from "@/src/memory/memory-api";
import { getPostgresPool } from "@/src/memory/postgres";
import {
  DECISION_COLLECTION,
  ensureDecisionCollection,
  getQdrantClient,
} from "@/src/memory/qdrant";
import type { Decision } from "@/src/memory/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const TEST_ID = "TEST-001";
const TEST_PROJECT = "amir-dev-brain";

function pointIdForDecision(decisionId: string) {
  const bytes = createHash("sha256")
    .update(`amir-dev-brain:${decisionId}`)
    .digest()
    .subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

async function cleanupSmokeRecord() {
  const result = {
    qdrant: "PASS" as "PASS" | "FAIL",
    postgres: "PASS" as "PASS" | "FAIL",
  };

  try {
    await ensureDecisionCollection();
    await getQdrantClient().delete(DECISION_COLLECTION, {
      wait: true,
      points: [pointIdForDecision(TEST_ID)],
    });
  } catch (error) {
    result.qdrant = "FAIL";
    console.error("[memory-smoke] qdrant cleanup failed", {
      message: error instanceof Error ? error.message : String(error),
    });
  }

  try {
    await getPostgresPool().query(
      `delete from public.decisions where id = $1`,
      [TEST_ID],
    );
  } catch (error) {
    result.postgres = "FAIL";
    console.error("[memory-smoke] postgres cleanup failed", {
      message: error instanceof Error ? error.message : String(error),
    });
  }

  return result;
}

async function runSmoke() {
  const startedAt = new Date().toISOString();
  const steps = {
    postgres: { status: "PENDING", found: false, id: null as string | null },
    qdrant: { status: "PENDING", found: false, points: 0 },
    vectorStatus: { status: "PENDING", value: null as string | null },
    getDecisionsByIds: { status: "PENDING", found: false, count: 0 },
    searchDecisions: { status: "PENDING", found: false, count: 0 },
    cleanup: { status: "PENDING", qdrant: "PENDING", postgres: "PENDING" },
  };

  let failure: string | null = null;

  try {
    await cleanupSmokeRecord();

    const now = new Date().toISOString();
    const decision: Decision = {
      id: TEST_ID,
      project: TEST_PROJECT,
      title: "Smoke Test Decision",
      synthesis: "Testing PostgreSQL SSOT and Qdrant Indexing flow.",
      state: "ACTIVE",
      approvedBy: "amir_owner",
      approvedAt: now,
      createdAt: now,
      updatedAt: now,
      councilVersion: "memory-smoke-v1",
      modelContext: ["memory-e2e-smoke"],
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

    await saveDecision(decision);

    const readback = await getDecisionById(TEST_ID);
    const postgresPass = Boolean(
      readback &&
        readback.id === TEST_ID &&
        readback.project === TEST_PROJECT &&
        readback.title === "Smoke Test Decision" &&
        readback.state === "ACTIVE" &&
        readback.approvedBy === "amir_owner",
    );

    steps.postgres = {
      status: postgresPass ? "PASS" : "FAIL",
      found: Boolean(readback),
      id: readback?.id ?? null,
    };

    steps.vectorStatus = {
      status: readback?.vectorStatus === "INDEXED" ? "PASS" : "FAIL",
      value: readback?.vectorStatus ?? null,
    };

    await ensureDecisionCollection();
    const qdrantResult = await getQdrantClient().retrieve(DECISION_COLLECTION, {
      ids: [pointIdForDecision(TEST_ID)],
      with_payload: true,
      with_vector: false,
    });

    const qdrantFound = qdrantResult.some(
      (point) => point.payload?.decisionId === TEST_ID,
    );
    steps.qdrant = {
      status: qdrantFound ? "PASS" : "FAIL",
      found: qdrantFound,
      points: qdrantResult.length,
    };

    const byIds = await getDecisionsByIds([TEST_ID]);
    const byIdsFound = byIds.some((item) => item.id === TEST_ID);
    steps.getDecisionsByIds = {
      status: byIdsFound ? "PASS" : "FAIL",
      found: byIdsFound,
      count: byIds.length,
    };

    const semantic = await searchDecisions(
      "PostgreSQL source of truth with Qdrant semantic indexing smoke test decision",
      { project: TEST_PROJECT, limit: 10 },
    );
    const semanticFound = semantic.some((item) => item.id === TEST_ID);
    steps.searchDecisions = {
      status: semanticFound ? "PASS" : "FAIL",
      found: semanticFound,
      count: semantic.length,
    };

    const allPassed = [
      steps.postgres.status,
      steps.qdrant.status,
      steps.vectorStatus.status,
      steps.getDecisionsByIds.status,
      steps.searchDecisions.status,
    ].every((status) => status === "PASS");

    if (!allPassed) failure = "one_or_more_memory_smoke_assertions_failed";
  } catch (error) {
    failure = error instanceof Error ? error.message : String(error);
  } finally {
    const cleanup = await cleanupSmokeRecord();
    steps.cleanup = {
      status:
        cleanup.qdrant === "PASS" && cleanup.postgres === "PASS"
          ? "PASS"
          : "FAIL",
      qdrant: cleanup.qdrant,
      postgres: cleanup.postgres,
    };
  }

  const ok = !failure && steps.cleanup.status === "PASS";
  return Response.json(
    {
      ok,
      testId: TEST_ID,
      startedAt,
      finishedAt: new Date().toISOString(),
      steps,
      failure,
    },
    { status: ok ? 200 : 500 },
  );
}

export async function POST(_request: NextRequest) {
  return runSmoke();
}

export async function GET(_request: NextRequest) {
  return runSmoke();
}
