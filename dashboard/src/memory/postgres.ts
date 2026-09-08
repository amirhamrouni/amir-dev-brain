import "server-only";

import { Pool, type PoolConfig } from "pg";

declare global {
  // Reuse the same pool inside a warm Next.js/Vercel process.
  var __amirDevBrainPgPool: Pool | undefined;
}

function readPositiveInteger(raw: string | undefined, fallback: number) {
  const parsed = Number.parseInt(String(raw || ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function isPostgresConfigured() {
  return Boolean(process.env.DATABASE_URL?.trim());
}

function createPool() {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error("database_url_missing");
  }

  const config: PoolConfig = {
    connectionString,
    max: readPositiveInteger(process.env.PG_POOL_MAX, 3),
    idleTimeoutMillis: readPositiveInteger(process.env.PG_IDLE_TIMEOUT_MS, 10_000),
    connectionTimeoutMillis: readPositiveInteger(process.env.PG_CONNECT_TIMEOUT_MS, 5_000),
    allowExitOnIdle: true,
    application_name: "amir-dev-brain-memory-api",
  };

  return new Pool(config);
}

export function getPostgresPool() {
  if (!globalThis.__amirDevBrainPgPool) {
    globalThis.__amirDevBrainPgPool = createPool();
  }

  return globalThis.__amirDevBrainPgPool;
}
