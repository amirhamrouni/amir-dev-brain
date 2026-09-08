import "server-only";

import { QdrantClient } from "@qdrant/js-client-rest";

export const DECISION_COLLECTION = "amir_dev_brain_decisions";
export const DEFAULT_QDRANT_VECTOR_SIZE = 1536;

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

export async function ensureDecisionCollection(vectorSize = getConfiguredVectorSize()) {
  const client = getQdrantClient();
  const collections = await client.getCollections();
  const exists = collections.collections.some(
    (collection) => collection.name === DECISION_COLLECTION,
  );

  if (exists) return;

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
