import "server-only";

import OpenAI from "openai";
import { getConfiguredVectorSize } from "./qdrant";
import type { Decision } from "./types";

const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";

declare global {
  var __amirDevBrainEmbeddingClient: OpenAI | undefined;
}

function getEmbeddingClient() {
  if (globalThis.__amirDevBrainEmbeddingClient) {
    return globalThis.__amirDevBrainEmbeddingClient;
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("openai_api_key_missing_for_embeddings");

  globalThis.__amirDevBrainEmbeddingClient = new OpenAI({ apiKey });
  return globalThis.__amirDevBrainEmbeddingClient;
}

export function getEmbeddingModel() {
  return process.env.EMBEDDING_MODEL?.trim() || DEFAULT_EMBEDDING_MODEL;
}

export function buildDecisionEmbeddingText(decision: Decision) {
  return [
    decision.title,
    decision.question || "",
    decision.synthesis,
    `project:${decision.project}`,
    `state:${decision.state}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

export async function embedText(text: string) {
  const input = text.trim();
  if (!input) throw new Error("embedding_input_required");

  const dimensions = getConfiguredVectorSize();
  const response = await getEmbeddingClient().embeddings.create({
    model: getEmbeddingModel(),
    input,
    dimensions,
    encoding_format: "float",
  });

  const vector = response.data[0]?.embedding;
  if (!vector?.length) throw new Error("embedding_empty_response");
  if (vector.length !== dimensions) {
    throw new Error(`embedding_dimension_mismatch:${vector.length}:${dimensions}`);
  }

  return vector;
}
