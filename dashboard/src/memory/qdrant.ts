import "server-only";

import { QdrantClient } from "@qdrant/js-client-rest";

export const DECISION_COLLECTION = "amir_dev_brain_decisions";
export const DEFAULT_QDRANT_VECTOR_SIZE = 1536;

const DECISION_KEYWORD_INDEXES = ["decisionId", "project", "state"] as const;

declare global {
  var __amirDevBrainQdrantClient: QdrantClient | undefined;
}

function readVectorSize() {
  const parsed = Number.parseInt(String(process.env.QDRANT_VECTOR_SIZE || ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_QDRANT_VECTOR_SIZE;
}

export function getConfiguredVectorSize() {
  return readVectorSize();
}

export function isQdrantConfigured() {
  return Boolean(process.env.QDRANT_URL?.trim());
}

export function getQdrantClient() {
  if (globalThis.__amirDevBrainQdrantClient) {
    return globalThis.__amirDevBrainQdrantClient;
  }

  const url = process.env.QDRANT_URL?.trim();
  if (!url) {
    throw new Error("qdrant_url_missing");
  }

  const apiKey = process.env.QDRANT_API_KEY?.trim();
  globalThis.__amirDevBrainQdrantClient = new QdrantClient({
    url,
    apiKey: apiKey || undefined,
  });

  return globalThis.__amirDevBrainQdrantClient;
}

async function ensureDecisionPayloadIndexes(client: QdrantClient) {
  const info = await client.getCollection(DECISION_COLLECTION);
  const payloadSchema = info.payload_schema ?? {};

  for (const fieldName of DECISION_KEYWORD_INDEXES) {
    if (payloadSchema[fieldName]) continue;

    try {
      await client.createPayloadIndex(DECISION_COLLECTION, {
        wait: true,
        field_name: fieldName,
        field_schema: "keyword",
      });
    } catch (error) {
      // Serverless instances may race to create the same payload index.
      const afterRace = await client.getCollection(DECISION_COLLECTION).catch(() => null);
      if (!afterRace?.payload_schema?.[fieldName]) throw error;
    }
  }
}

export async function ensureDecisionCollection(vectorSize = getConfiguredVectorSize()) {
  const client = getQdrantClient();
  const collections = await client.getCollections();
  const exists = collections.collections.some(
    (collection) => collection.name === DECISION_COLLECTION,
  );

  if (!exists) {
    try {
      await client.createCollection(DECISION_COLLECTION, {
        vectors: {
          size: vectorSize,
          distance: "Cosine",
        },
      });
    } catch (error) {
      // Two warm serverless instances may race to create the same collection.
      const afterRace = await client.getCollections().catch(() => null);
      const createdElsewhere = afterRace?.collections.some(
        (collection) => collection.name === DECISION_COLLECTION,
      );

      if (!createdElsewhere) throw error;
    }
  }

  await ensureDecisionPayloadIndexes(client);
}
