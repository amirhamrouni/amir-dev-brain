import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Role = "architect" | "critic" | "engineer" | "judge";
const roles: Array<{ id: Role; label: string; instruction: string }> = [
  { id: "architect", label: "Architect", instruction: "اقترح أبسط معمارية قوية وقابلة للتنفيذ. اذكر الافتراضات والمخاطر ولا تجامل." },
  { id: "critic", label: "Critic", instruction: "اقرأ اقتراح Architect، اعترض على نقاط الضعف والافتراضات الخاطئة، واقترح تصحيحات محددة." },
  { id: "engineer", label: "Engineer", instruction: "اقرأ الاقتراح والنقد وحوّلهما إلى خطة تنفيذ عملية قليلة التعقيد مع ترتيب الأولويات والاختبارات." },
  { id: "judge", label: "Judge", instruction: "احسم الخلافات. أخرج خلاصة نهائية وقراراً تنفيذياً واضحاً، البدائل المرفوضة، المخاطر، وخطوات العمل. لا تعتبر القرار معتمداً حتى يوافق أمير." },
];

function geminiKey() {
  return (process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || "").trim();
}

async function generate(role: typeof roles[number], question: string, history: string) {
  const key = geminiKey();
  if (!key) throw new Error("GEMINI_API_KEY_MISSING");
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const prompt = `أنت ${role.label} داخل مجلس Amir Dev Brain.\n${role.instruction}\n\nسؤال أمير:\n${question}\n\nمداولات الأدوار السابقة:\n${history || "لا توجد بعد."}\n\nاكتب بالعربية الواضحة وباختصار مفيد.`;
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse&key=${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature: role.id === "judge" ? 0.25 : 0.55, maxOutputTokens: 1400 } }),
    cache: "no-store",
  });
  if (!response.ok || !response.body) throw new Error(`GEMINI_${response.status}`);
  return response.body;
}

function extractText(data: string) {
  try { const parsed = JSON.parse(data); return parsed?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || "").join("") || ""; } catch { return ""; }
}

export async function POST(req: NextRequest) {
  let body: { question?: string; project?: string };
  try { body = await req.json(); } catch { return Response.json({ error: "invalid_json" }, { status: 400 }); }
  const question = String(body.question || "").trim();
  if (!question) return Response.json({ error: "question_required" }, { status: 400 });
  if (!geminiKey()) return Response.json({ error: "gemini_api_key_missing" }, { status: 503 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: object) => controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      let history = "";
      try {
        send({ type: "start", project: body.project || "amir-dev-brain" });
        for (const role of roles) {
          send({ type: "role_start", role: role.id, label: role.label });
          const geminiStream = await generate(role, question, history);
          const reader = geminiStream.getReader();
          const decoder = new TextDecoder();
          let buffer = "";
          let answer = "";
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const blocks = buffer.split("\n\n");
            buffer = blocks.pop() || "";
            for (const block of blocks) {
              for (const line of block.split("\n")) {
                if (!line.startsWith("data:")) continue;
                const text = extractText(line.slice(5).trim());
                if (text) { answer += text; send({ type: "delta", role: role.id, text }); }
              }
            }
          }
          history += `\n\n### ${role.label}\n${answer}`;
          send({ type: "role_done", role: role.id, text: answer });
        }
        send({ type: "done", decision: { project: body.project || "amir-dev-brain", question, transcript: history.trim(), final: history.split("### Judge").pop()?.trim() || "", status: "pending_approval", created_at: new Date().toISOString(), council_version: "lite-v1" } });
      } catch (error) {
        send({ type: "error", message: error instanceof Error ? error.message : "council_lite_failed" });
      } finally { controller.close(); }
    },
  });
  return new Response(stream, { headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-cache, no-transform", "x-accel-buffering": "no" } });
}
