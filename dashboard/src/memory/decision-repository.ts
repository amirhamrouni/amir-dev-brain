import "server-only";

import { createHash } from "node:crypto";
import type { QueryResultRow } from "pg";
import { getPostgresPool } from "./postgres";
import {
  DECISION_COLLECTION,
  ensureDecisionCollection,
  getConfiguredVectorSize,
  getQdrantClient,
} from "./qdrant";
import type {
  Decision,
  DecisionState,
  EvidenceCriticality,
  EvidenceLink,
  EvidenceRelation,
  EvidenceStatus,
  ReviewPolicy,
  VectorStatus,
  VersionBinding,
} from "./types";

type DecisionRow = QueryResultRow & {
  id: string;
  project: string;
  title: string;
  question: string | null;
  synthesis: string;
  state: DecisionState;
  approved_by: string;
  approved_at: Date | string;
  council_version: string | null;
  model_context: unknown;
  version_bindings: unknown;
  review_policy: unknown;
  supersedes: string | null;
  vector_status: VectorStatus;
  created_at: Date | string;
  updated_at: Date | string;
};

type EvidenceLinkRow = QueryResultRow & {
  decision_id: string;
  evidence_id: string;
  relation: EvidenceRelation;
  criticality: EvidenceCriticality;
  status: EvidenceStatus;
};

function toIso(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function asVersionBindings(value: unknown): VersionBinding[] {
  return Array.isArray(value) ? (value as VersionBinding[]) : [];
}

function asReviewPolicy(value: unknown): ReviewPolicy {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const candidate = value as Partial<ReviewPolicy>;
    return {
      reviewAfter:
        typeof candidate.reviewAfter === "string" || candidate.reviewAfter === null
          ? candidate.reviewAfter
          : null,
      maxAgeDays:
        typeof candidate.maxAgeDays === "number" && candidate.maxAgeDays > 0
          ? candidate.maxAgeDays
          : 90,
      triggers: Array.isArray(candidate.triggers) ? candidate.triggers : [],
    };
  }

  return { reviewAfter: null, maxAgeDays: 90, triggers: [] };
}

function mapDecisionRow(row: DecisionRow, evidenceLinks: EvidenceLink[] = []): Decision {
  return {
    id: row.id,
    project: row.project,
    title: row.title,
    question: row.question,
    synthesis: row.synthesis,
    state: row.state,
    approvedBy: row.approved_by,
    approvedAt: toIso(row.approved_at),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
    councilVersion: row.council_version,
    modelContext: asStringArray(row.model_context),
    versionBindings: asVersionBindings(row.version_bindings),
    evidenceLinks,
    reviewPolicy: asReviewPolicy(row.review_policy),
    supersedes: row.supersedes,
    vectorStatus: row.vector_status,
  };
}

async function getEvidenceLinksByDecisionIds(ids: string[]) {
  const result = await getPostgresPool().query<EvidenceLinkRow>(
    `
      select
        de.decision_id,
        de.evidence_id,
        de.relation,
        de.criticality,
        e.status
      from public.decision_evidence de
      join public.evidence e on e.id = de.evidence_id
      where de.decision_id = any($1::text[])
      order by de.evidence_id asc
    `,
    [ids],
  );

  const byDecision = new Map<string, EvidenceLink[]>();
  for (const row of result.rows) {
    const links = byDecision.get(row.decision_id) ?? [];
    links.push({
      evidenceId: row.evidence_id,
      relation: row.relation,
      criticality: row.criticality,
      status: row.status,
    });
    byDecision.set(row.decision_id, links);
  }

  return byDecision;
}

export async function insertDecision(decision: Decision): Promise<Decision> {
  const pool = getPostgresPool();
  const client = await pool.connect();

  try {
    await client.query("begin");

    await client.query(
      `
        insert into public.decisions (
          id,
          project,
          title,
          question,
          synthesis,
          state,
          approved_by,
          approved_at,
          council_version,
          model_context,
          version_bindings,
          review_policy,
          supersedes,
          vector_status,
          created_at,
          updated_at
        )
        values (
          $1, $2, $3, $4, $5, $6, $7, $8,
          $9, $10::jsonb, $11::jsonb, $12::jsonb,
          $13, 'PENDING', $14, $15
        )
        on conflict (id) do nothing
      `,
      [
        decision.id,
        decision.project,
        decision.title,
        decision.question ?? null,
        decision.synthesis,
        decision.state,
        decision.approvedBy,
        decision.approvedAt,
        decision.councilVersion ?? null,
        JSON.stringify(decision.modelContext ?? []),
        JSON.stringify(decision.versionBindings ?? []),
        JSON.stringify(decision.reviewPolicy),
        decision.supersedes ?? null,
        decision.createdAt,
        decision.updatedAt,
      ],
    );

    for (const link of decision.evidenceLinks ?? []) {
      await client.query(
        `
          insert into public.decision_evidence (
            decision_id,
            evidence_id,
            relation,
            criticality
          )
          values ($1, $2, $3, $4)
          on conflict (decision_id, evidence_id) do nothing
        `,
        [decision.id, link.evidenceId, link.relation, link.criticality],
      );
    }

    await client.query("commit");
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }

  const stored = await getDecisionById(decision.id);
  if (!stored) throw new Error("decision_insert_succeeded_but_readback_failed");
  return stored;
}

export async function getDecisionById(id: string): Promise<Decision | null> {
  const result = await getPostgresPool().query<DecisionRow>(
    `select * from public.decisions where id = $1 limit 1`,
    [id],
  );

  const row = result.rows[0];
  if (!row) return null;

  const evidence = await getEvidenceLinksByDecisionIds([id]);
  return mapDecisionRow(row, evidence.get(id) ?? []);
}

export async function updateVectorStatus(id: string, status: VectorStatus): Promise<void> {
  const result = await getPostgresPool().query(
    `
      update public.decisions
      set vector_status = $2
      where id = $1
    `,
    [id, status],
  );

  if ((result.rowCount ?? 0) === 0) {
    throw new Error("decision_not_found");
  }
}

export async function getDecisionsByIds(ids: string[]): Promise<Decision[]> {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (uniqueIds.length === 0) return [];

  const [result, evidence] = await Promise.all([
    getPostgresPool().query<DecisionRow>(
      `select * from public.decisions where id = any($1::text[])`,
      [uniqueIds],
    ),
    getEvidenceLinksByDecisionIds(uniqueIds),
  ]);

  const byId = new Map(
    result.rows.map((row) => [
      row.id,
      mapDecisionRow(row, evidence.get(row.id) ?? []),
    ]),
  );

  return ids.map((id) => byId.get(id)).filter((item): item is Decision => Boolean(item));
}

function decisionPointId(decisionId: string) {
  const bytes = createHash("sha256")
    .update(`amir-dev-brain:${decisionId}`)
    .digest()
    .subarray(0, 16);

  // Deterministic UUID-shaped point id: version 5 + RFC 4122 variant bits.
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export async function indexDecisionVector(decision: Decision, vector: number[]) {
  try {
    const expectedSize = getConfiguredVectorSize();
    if (vector.length !== expectedSize) {
      throw new Error(`qdrant_vector_size_mismatch:${vector.length}:${expectedSize}`);
    }

    await ensureDecisionCollection(expectedSize);
    await getQdrantClient().upsert(DECISION_COLLECTION, {
      wait: true,
      points: [
        {
          id: decisionPointId(decision.id),
          vector,
          payload: {
            decisionId: decision.id,
            project: decision.project,
            title: decision.title,
            state: decision.state,
            approvedAt: decision.approvedAt,
            councilVersion: decision.councilVersion ?? null,
          },
        },
      ],
    });

    await updateVectorStatus(decision.id, "INDEXED");
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[memory] Qdrant indexing failed", { decisionId: decision.id, message });

    await updateVectorStatus(decision.id, "FAILED").catch((statusError) => {
      console.error("[memory] failed to record Qdrant failure status", {
        decisionId: decision.id,
        message: statusError instanceof Error ? statusError.message : String(statusError),
      });
    });

    return false;
  }
}
