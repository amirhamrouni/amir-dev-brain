import "server-only";

import { buildDecisionEmbeddingText, embedText } from "./embeddings";
import {
  getDecisionById,
  getDecisionsByIds,
  indexDecisionVector,
  insertDecision,
  updateVectorStatus,
} from "./decision-repository";
import { getPostgresPool } from "./postgres";
import {
  DECISION_COLLECTION,
  ensureDecisionCollection,
  getQdrantClient,
} from "./qdrant";
import type {
  Decision,
  DecisionSearchOptions,
  DecisionState,
  EvidenceLink,
  MemoryAPI,
} from "./types";

export async function saveDecision(decision: Decision): Promise<Decision> {
  const stored = await insertDecision(decision);

  try {
    const vector = await embedText(buildDecisionEmbeddingText(stored));
    await indexDecisionVector(stored, vector);
  } catch (error) {
    await updateVectorStatus(stored.id, "FAILED").catch(() => undefined);
    console.error("[memory] decision saved but semantic indexing failed", {
      decisionId: stored.id,
      message: error instanceof Error ? error.message : String(error),
    });
  }

  const refreshed = await getDecisionById(stored.id);
  if (!refreshed) throw new Error("decision_missing_after_save");
  return refreshed;
}

export async function getDecision(id: string) {
  return getDecisionById(id);
}

export async function searchDecisions(
  query: string,
  options: DecisionSearchOptions = {},
): Promise<Decision[]> {
  const vector = await embedText(query);
  await ensureDecisionCollection(vector.length);

  const limit = Math.min(Math.max(options.limit ?? 10, 1), 50);
  const result = await getQdrantClient().query(DECISION_COLLECTION, {
    query: vector,
    limit: Math.max(limit, options.states?.length ? limit * 2 : limit),
    with_payload: true,
    with_vector: false,
    filter: options.project
      ? {
          must: [
            {
              key: "project",
              match: { value: options.project },
            },
          ],
        }
      : undefined,
  });

  const ids = result.points
    .map((point) => point.payload?.decisionId)
    .filter((id): id is string => typeof id === "string" && id.length > 0);

  const decisions = await getDecisionsByIds(ids);
  const allowedStates = options.states?.length ? new Set(options.states) : null;

  return decisions
    .filter((decision) => !allowedStates || allowedStates.has(decision.state))
    .slice(0, limit);
}

export async function updateDecisionState(id: string, state: DecisionState) {
  const result = await getPostgresPool().query(
    `update public.decisions set state = $2, vector_status = 'PENDING' where id = $1`,
    [id, state],
  );

  if ((result.rowCount ?? 0) === 0) throw new Error("decision_not_found");
}

export async function attachEvidence(decisionId: string, evidence: EvidenceLink) {
  const result = await getPostgresPool().query(
    `
      insert into public.decision_evidence (
        decision_id,
        evidence_id,
        relation,
        criticality
      )
      values ($1, $2, $3, $4)
      on conflict (decision_id, evidence_id)
      do update set relation = excluded.relation, criticality = excluded.criticality
    `,
    [decisionId, evidence.evidenceId, evidence.relation, evidence.criticality],
  );

  if ((result.rowCount ?? 0) === 0) throw new Error("evidence_link_not_written");
}

export async function reindexDecision(id: string) {
  const decision = await getDecisionById(id);
  if (!decision) throw new Error("decision_not_found");

  await updateVectorStatus(id, "PENDING");
  const vector = await embedText(buildDecisionEmbeddingText(decision));
  const indexed = await indexDecisionVector(decision, vector);
  if (!indexed) throw new Error("qdrant_index_failed");
}

export const memoryApi: MemoryAPI = {
  saveDecision,
  getDecision,
  searchDecisions,
  updateDecisionState,
  attachEvidence,
  reindexDecision,
};
