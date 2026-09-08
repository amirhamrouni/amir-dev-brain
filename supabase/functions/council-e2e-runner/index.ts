import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { Client } from "npm:@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "npm:@modelcontextprotocol/sdk/client/streamableHttp.js";

const PROJECT_REF = "hdcpvwsndxxflbednvsq";
const MCP_URL = `https://${PROJECT_REF}.supabase.co/functions/v1/open-brain-mcp`;
const DASHBOARD_ORIGINS = new Set([
  "https://amir-brain-console.vercel.app",
  "http://localhost:3000",
]);

function corsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  return {
    "access-control-allow-origin": DASHBOARD_ORIGINS.has(origin) ? origin : "https://amir-brain-console.vercel.app",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "authorization, content-type, x-runner-token, x-amir-key, x-brain-key",
    "vary": "Origin",
  };
}

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...corsHeaders(req) },
  });
}

function normalizeKey(raw: string) {
  let value = raw.trim();
  value = value.replace(/^MCP_ACCESS_KEY\s*=\s*/i, "").trim();
  value = value.replace(/^Bearer\s+/i, "").trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1).trim();
  }
  return value;
}

function readDashboardKey(req: Request) {
  const authorization = req.headers.get("authorization") || "";
  const bearer = /^Bearer\s+/i.test(authorization) ? authorization : "";
  return normalizeKey(
    req.headers.get("x-brain-key") ||
    req.headers.get("x-amir-key") ||
    bearer ||
    "",
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(req) });
  if (req.method !== "POST") return json(req, { error: "method_not_allowed" }, 405);

  const configuredBrainKey = normalizeKey(Deno.env.get("MCP_ACCESS_KEY") || "");
  const expectedRunner = normalizeKey(Deno.env.get("COUNCIL_RUNNER_TOKEN") || "");
  const suppliedRunner = normalizeKey(req.headers.get("x-runner-token") || "");
  const suppliedBrain = readDashboardKey(req);
  const runnerAuthorized = Boolean(expectedRunner) && suppliedRunner === expectedRunner;

  if (!configuredBrainKey) {
    return json(req, {
      error: "mcp_access_key_missing",
      message: "MCP_ACCESS_KEY غير مهيأ على الخادم.",
    }, 500);
  }

  if (!runnerAuthorized) {
    if (!suppliedBrain) {
      return json(req, {
        error: "missing_access_key",
        message: "لم يصل مفتاح الوصول من الواجهة إلى الخادم.",
      }, 401);
    }
    if (suppliedBrain !== configuredBrainKey) {
      return json(req, {
        error: "auth_key_mismatch",
        message: "المفتاح الذي وصل من الواجهة لا يطابق MCP_ACCESS_KEY الحالي على Supabase.",
        diagnostics: {
          supplied_length: suppliedBrain.length,
          configured_length: configuredBrainKey.length,
        },
      }, 401);
    }
  }

  // Once the caller is authenticated, always use the canonical server-side key
  // for the internal MCP hop. This removes browser/header formatting differences.
  const effectiveBrainKey = configuredBrainKey;

  try {
    const body = await req.json().catch(() => ({}));
    const projectSlug = body.project_slug || "amir-dev-brain";
    const question = body.question || "v1-architecture-and-pipeline";
    const rounds = Number.isInteger(body.rounds) ? Math.min(3, Math.max(1, body.rounds)) : 1;
    const requestedTool = body.tool_name === "capture_thought" ? "capture_thought" : "amir_council_debate";
    const requestedArguments = requestedTool === "capture_thought"
      ? { content: String(body.content || "") }
      : { project_slug: projectSlug, question, rounds };

    if (requestedTool === "capture_thought" && !requestedArguments.content.trim()) {
      return json(req, { ok: false, error: "capture_thought content is required" }, 400);
    }

    const transport = new StreamableHTTPClientTransport(new URL(MCP_URL), {
      requestInit: { headers: { "x-brain-key": effectiveBrainKey } },
    });

    const client = new Client({ name: "amir-council-dashboard-runner", version: "1.5.0" });
    await client.connect(transport);
    const result = await client.callTool({ name: requestedTool, arguments: requestedArguments }, undefined, {
      timeout: 240_000,
      maxTotalTimeout: 240_000,
    });
    await client.close();

    if ((result as any)?.isError) return json(req, { ok: false, result }, 502);
    return json(req, { ok: true, tool: requestedTool, result });
  } catch (error) {
    const message = String(error?.message || error);
    const unauthorized = /401|unauthorized|forbidden|invalid.*key|access.*key/i.test(message);
    return json(req, {
      ok: false,
      error: unauthorized ? "mcp_internal_auth_failed" : "mcp_call_failed",
      message: unauthorized
        ? "تم قبول مفتاح الواجهة، لكن Open Brain MCP رفض المفتاح الداخلي. أعدنا توحيد المسار على المفتاح المخزن في Supabase؛ إذا استمرت الرسالة فالمشكلة في نسخة MCP المنشورة لا في إدخالك."
        : message,
    }, unauthorized ? 502 : 500);
  }
});