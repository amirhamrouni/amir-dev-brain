import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { Client } from "npm:@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "npm:@modelcontextprotocol/sdk/client/streamableHttp.js";

const PROJECT_REF = "hdcpvwsndxxflbednvsq";
const MCP_URL = `https://${PROJECT_REF}.supabase.co/functions/v1/open-brain-mcp`;

Deno.serve(async (req) => {
  const expected = Deno.env.get("COUNCIL_RUNNER_TOKEN") || "";
  const supplied = req.headers.get("x-runner-token") || "";
  if (!expected || supplied !== expected) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  const brainKey = Deno.env.get("MCP_ACCESS_KEY");
  if (!brainKey) {
    return new Response(JSON.stringify({ error: "MCP_ACCESS_KEY missing" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const projectSlug = body.project_slug || "smart-twin-hamrouni";
    const question = body.question || "v1-architecture-and-pipeline";
    const rounds = Number.isInteger(body.rounds) ? body.rounds : 1;
    const requestedTool = body.tool_name === "capture_thought" ? "capture_thought" : "amir_council_debate";
    const requestedArguments = requestedTool === "capture_thought"
      ? { content: String(body.content || "") }
      : { project_slug: projectSlug, question, rounds };

    if (requestedTool === "capture_thought" && !requestedArguments.content.trim()) {
      return new Response(JSON.stringify({ ok: false, error: "capture_thought content is required" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    const transport = new StreamableHTTPClientTransport(new URL(MCP_URL), {
      requestInit: {
        headers: {
          "x-brain-key": brainKey,
        },
      },
    });

    const client = new Client({ name: "amir-council-e2e-runner", version: "1.1.0" });
    await client.connect(transport);
    const result = await client.callTool({
      name: requestedTool,
      arguments: requestedArguments,
    }, undefined, {
      timeout: 240_000,
      maxTotalTimeout: 240_000,
    });
    await client.close();

    if ((result as any)?.isError) {
      return new Response(JSON.stringify({ ok: false, result }), {
        status: 502,
        headers: { "content-type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, tool: requestedTool, result }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ ok: false, error: String(error?.message || error) }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
});
