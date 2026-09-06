import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient } from "npm:@supabase/supabase-js@2.47.10";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;
const MCP_ACCESS_KEY = Deno.env.get("MCP_ACCESS_KEY")!;
const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") || "gemini-3.6-flash";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

type RequestBody = {
  project_key?: string;
  question?: string;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

async function loadContext(projectKey: string) {
  const [facts, decisions, lessons, handoffs] = await Promise.all([
    supabase.from("project_facts").select("fact_key,fact_value,source,confidence,updated_at").eq("project_key", projectKey).order("updated_at", { ascending: false }).limit(30),
    supabase.from("approved_decisions").select("decision_key,question,decision,rationale,status,updated_at").eq("project_key", projectKey).eq("status", "approved").order("updated_at", { ascending: false }).limit(20),
    supabase.from("lessons").select("title,problem,root_cause,solution,prevention,tags,created_at").eq("project_key", projectKey).order("created_at", { ascending: false }).limit(20),
    supabase.from("project_handoffs").select("repository,branch,commit_sha,completed,remaining,blockers,next_action,created_at").eq("project_key", projectKey).order("created_at", { ascending: false }).limit(5),
  ]);

  const failures = [facts.error, decisions.error, lessons.error, handoffs.error].filter(Boolean);
  if (failures.length) throw new Error(failures.map((e) => e!.message).join(" | "));

  return {
    facts: facts.data || [],
    approved_decisions: decisions.data || [],
    lessons: lessons.data || [],
    handoffs: handoffs.data || [],
  };
}

async function askGemini(question: string, projectKey: string, context: unknown) {
  const system = [
    "You are Gemini acting as one independent member of Amir's Model Council.",
    "Use the supplied Amir Dev Brain context when relevant.",
    "Facts, prior approved decisions, lessons, and handoffs are authoritative context.",
    "Your answer is an opinion, not a final decision. Never overwrite or pretend to approve a decision for Amir.",
    "Be concise, technical, practical, and explicit about uncertainty.",
    "Return plain text with: Assessment, Recommendation, Risks, Confidence (0-1).",
  ].join("\n");

  const prompt = `${system}\n\nPROJECT: ${projectKey}\n\nAMIR DEV BRAIN CONTEXT:\n${JSON.stringify(context, null, 2)}\n\nQUESTION:\n${question}`;

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 1200 },
    }),
  });

  const raw = await response.text();
  if (!response.ok) throw new Error(`Gemini API ${response.status}: ${raw.slice(0, 1000)}`);

  const data = JSON.parse(raw);
  const text = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || "").join("\n").trim();
  if (!text) throw new Error("Gemini returned no text response");
  return text;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "content-type,authorization,x-amir-key" } });
  }

  const url = new URL(req.url);
  const suppliedKey = req.headers.get("x-amir-key") || url.searchParams.get("key") || "";
  if (!MCP_ACCESS_KEY || suppliedKey !== MCP_ACCESS_KEY) return json({ ok: false, error: "unauthorized" }, 401);

  if (req.method === "GET") {
    return json({ ok: true, service: "gemini-brain", model: GEMINI_MODEL, message: "POST { project_key, question } to ask Gemini using Amir Dev Brain context." });
  }

  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  try {
    const body = (await req.json()) as RequestBody;
    const projectKey = body.project_key?.trim() || "amir-dev-brain";
    const question = body.question?.trim();
    if (!question) return json({ ok: false, error: "question_required" }, 400);

    const context = await loadContext(projectKey);
    const opinion = await askGemini(question, projectKey, context);

    const { data, error } = await supabase.from("model_opinions").insert({
      project_key: projectKey,
      question,
      model_name: GEMINI_MODEL,
      opinion,
      recommendation: null,
      confidence: null,
      evidence: [{ source: "amir-dev-brain-context", context_counts: {
        facts: context.facts.length,
        approved_decisions: context.approved_decisions.length,
        lessons: context.lessons.length,
        handoffs: context.handoffs.length,
      }}],
    }).select("id,created_at").single();

    if (error) throw new Error(`Could not store Gemini opinion: ${error.message}`);

    return json({ ok: true, project_key: projectKey, model: GEMINI_MODEL, opinion_id: data.id, created_at: data.created_at, opinion });
  } catch (error) {
    console.error(error);
    return json({ ok: false, error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
