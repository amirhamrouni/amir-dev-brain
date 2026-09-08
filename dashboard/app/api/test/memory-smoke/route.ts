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

async function cleanupSmokeRecord() {
  const result = {
    qdrant: "PASS" as "PASS" | "FAIL",
    postgres: "PASS" as "PASS" | "FAIL",
  };

  try {
    await ensureDecisionCollection();
    await getQdrantClient().delete(DECISION_COLLECTION, {
      wait: true,
      filter: {
        must: [
          {
            key: "decisionId",
            match: { value: TEST_ID },
          },
        ],
      },
    });
  } catch (error) {
    result.qdrant = "FAIL";
    console.error("[memory-smoke] qdrant cleanup failed", {
      message: error instanceof Error ? error.message : String(error),
    });
  }

  try {
    await getPostgresPool().query(`delete from public.decisions where id = $1`, [TEST_ID]);
  } catch (error) {
    result.postgres = "FAIL";
    console.error("[memory-smoke] postgres cleanup failed", {
      message: error instanceof Error ? error.message : String(error),
    });
  }

  return result;
}

export async function POST(_request: NextRequest) {
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
        readback.synthesis === "Testing PostgreSQL SSOT and Qdrant Indexing flow." &&
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
    const qdrantResult = await getQdrantClient().scroll(DECISION_COLLECTION, {
      limit: 5,
      with_payload: true,
      with_vector: false,
      filter: {
        must: [
          {
            key: "decisionId",
            match: { value: TEST_ID },
          },
        ],
      },
    });

    const qdrantFound = qdrantResult.points.some(
      (point) => point.payload?.decisionId === TEST_ID,
    );
    steps.qdrant = {
      status: qdrantFound ? "PASS" : "FAIL",
      found: qdrantFound,
      points: qdrantResult.points.length,
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

    if (!allPassed) {
      failure = "one_or_more_memory_smoke_assertions_failed";
    }
  } catch (error) {
    failure = error instanceof Error ? error.message : String(error);
  } finally {
    const cleanup = await cleanupSmokeRecord();
    steps.cleanup = {
      status: cleanup.qdrant === "PASS" && cleanup.postgres === "PASS" ? "PASS" : "FAIL",
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
