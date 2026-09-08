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

function readDashboardKey(req: Request) {
  const authorization = (req.headers.get("authorization") || "").trim();
  const bearer = authorization.toLowerCase().startsWith("bearer ")
    ? authorization.slice(7).trim()
    : "";
  return (
    req.headers.get("x-brain-key") ||
    req.headers.get("x-amir-key") ||
    bearer ||
    ""
  ).trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(req) });
  if (req.method !== "POST") return json(req, { error: "method_not_allowed" }, 405);

  const configuredBrainKey = (Deno.env.get("MCP_ACCESS_KEY") || "").trim();
  const expectedRunner = (Deno.env.get("COUNCIL_RUNNER_TOKEN") || "").trim();
  const suppliedRunner = (req.headers.get("x-runner-token") || "").trim();
  const suppliedBrain = readDashboardKey(req);
  const runnerAuthorized = Boolean(expectedRunner) && suppliedRunner === expectedRunner;

  // Dashboard requests are authenticated by the canonical Open Brain MCP itself.
  // This avoids maintaining two independent comparisons of MCP_ACCESS_KEY.
  const effectiveBrainKey = runnerAuthorized ? configuredBrainKey : suppliedBrain;

  if (!effectiveBrainKey) {
    return json(req, {
      error: "missing_access_key",
      message: "لم يصل مفتاح الوصول إلى الخادم.",
    }, 401);
  }

  if (runnerAuthorized && !configuredBrainKey) {
    return json(req, {
      error: "mcp_access_key_missing",
      message: "MCP_ACCESS_KEY غير مهيأ على الخادم.",
    }, 500);
  }

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

    const client = new Client({ name: "amir-council-dashboard-runner", version: "1.4.0" });
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
      error: unauthorized ? "unauthorized" : "mcp_call_failed",
      message: unauthorized
        ? "المفتاح لم يقبله Open Brain MCP. تأكد أن القيمة هي MCP_ACCESS_KEY الحالية ثم أعد المحاولة."
        : message,
    }, unauthorized ? 401 : 500);
  }
});