import "server-only";

import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

function normalizeKey(raw: string) {
  let value = raw.trim();
  value = value.replace(/^ADB_EXECUTOR_KEY\s*=\s*/i, "").trim();
  value = value.replace(/^Bearer\s+/i, "").trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1).trim();
  }
  return value;
}

function secureMatch(provided: string, expected: string) {
  const providedBytes = Buffer.from(provided, "utf8");
  const expectedBytes = Buffer.from(expected, "utf8");
  return (
    providedBytes.length === expectedBytes.length &&
    timingSafeEqual(providedBytes, expectedBytes)
  );
}

export function authenticateExecutor(req: NextRequest) {
  const expected = normalizeKey(process.env.ADB_EXECUTOR_KEY || "");
  if (!expected) {
    return {
      ok: false as const,
      response: Response.json(
        { ok: false, error: "executor_key_not_configured" },
        { status: 503 },
      ),
    };
  }

  const provided = normalizeKey(
    req.headers.get("x-executor-key") || req.headers.get("authorization") || "",
  );
  if (!provided || !secureMatch(provided, expected)) {
    return {
      ok: false as const,
      response: Response.json(
        { ok: false, error: "executor_auth_failed" },
        { status: 401 },
      ),
    };
  }

  return { ok: true as const };
}
