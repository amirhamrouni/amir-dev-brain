import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type RoleId = "architect" | "critic" | "engineer" | "judge";
type RoleOutputMap = Record<RoleId, string>;

type RoleConfig = {
  id: RoleId;
  label: string;
  instruction: string;
  maxWords: number;
  maxOutputTokens: number;
  timeoutMs: number;
};

const MODEL = process.env.GEMINI_MODEL?.trim() || "gemini-3.6-flash";

const ROLES: RoleConfig[] = [
  {
    id: "architect",
    label: "Architect",
    maxWords: 120,
    maxOutputTokens: 420,
    timeoutMs: 11_500,
    instruction:
      "ابدأ من سؤال أمير مباشرة. اقترح أبسط حل معماري قوي وقابل للتنفيذ. اذكر الافتراضات والحدود والمخاطر وما الذي يجب ألا نضيفه الآن. لا تجامل.",
  },
  {
    id: "critic",
    label: "Critic",
    maxWords: 120,
    maxOutputTokens: 420,
    timeoutMs: 12_000,
    instruction:
      "راجع سؤال أمير ورد Architect بدقة. استخرج الاعتراضات والمخاطر والثغرات. كل اعتراض جوهري يجب أن يبدأ حرفياً بالوسم [CONFLICT_FLAG] ثم وصف قصير وواضح. لا تعِد صياغة رد المعماري فقط.",
  },
  {
    id: "engineer",
    label: "Engineer",
    maxWords: 140,
    maxOutputTokens: 480,
    timeoutMs: 12_500,
    instruction:
      "اقرأ سؤال أمير ورد Architect واعتراضات Critic. حوّل النقاش إلى آليات تنفيذ تقنية عملية: ملفات وواجهات وتدفق بيانات واختبارات وترتيب خطوات. عالج كل [CONFLICT_FLAG] بقرار تقني محدد.",
  },
  {
    id: "judge",
    label: "Judge",
    maxWords: 180,
    maxOutputTokens: 600,
    timeoutMs: 14_000,
    instruction:
      "اقرأ السؤال وكل المداولات السابقة. احسم الخلافات واكتب Synthesis نهائية قابلة للتنفيذ. نظّمها إلى: الإجماع، الخلافات المحسومة، القرار المقترح، مخاطر متبقية، وخطوات التنفيذ. هذه توصية مجلس وليست قراراً معتمداً قبل موافقة أمير.",
  },
];

function geminiKey() {
  return (process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || "").trim();
}

function historyFor(role: RoleId, outputs: Partial<RoleOutputMap>) {
  const parts: string[] = [];
  if (role !== "architect" && outputs.architect) parts.push(`### Architect\n${outputs.architect}`);
  if ((role === "engineer" || role === "judge") && outputs.critic) parts.push(`### Critic\n${outputs.critic}`);
  if (role === "judge" && outputs.engineer) parts.push(`### Engineer\n${outputs.engineer}`);
  return parts.join("\n\n");
}

function buildPrompt(role: RoleConfig, question: string, outputs: Partial<RoleOutputMap>) {
  const prior = historyFor(role.id, outputs);
  return [
    `أنت ${role.label} داخل Council Lite الخاص بـ Amir Dev Brain.`,
    role.instruction,
    `اكتب بالعربية الواضحة في حد أقصى ${role.maxWords} كلمة. ابدأ بالنتيجة مباشرة. لا تكتب تفكيرك الداخلي ولا تشرح تعليماتك.`,
    `## سؤال أمير\n${question}`,
    prior ? `## المداولات السابقة\n${prior}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function extractGeminiText(data: string) {
  try {
    const parsed = JSON.parse(data);
    return (
      parsed?.candidates?.[0]?.content?.parts
        ?.filter((part: { thought?: boolean }) => part?.thought !== true)
        ?.map((part: { text?: string }) => part?.text || "")
        .join("") || ""
    );
  } catch {
    return "";
  }
}

async function streamRole(
  role: RoleConfig,
  question: string,
  outputs: Partial<RoleOutputMap>,
  onDelta: (text: string) => void,
) {
  const key = geminiKey();
  if (!key) throw new Error("gemini_api_key_missing");

  const abortController = new AbortController();
  const timer = setTimeout(() => abortController.abort(), role.timeoutMs);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:streamGenerateContent?alt=sse`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": key,
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: buildPrompt(role, question, outputs) }] }],
          generationConfig: {
            maxOutputTokens: role.maxOutputTokens,
            thinkingConfig: {
              thinkingLevel: "minimal",
              includeThoughts: false,
            },
          },
        }),
        cache: "no-store",
        signal: abortController.signal,
      },
    );

    if (!response.ok || !response.body) {
      const detail = (await response.text().catch(() => "")).replace(/\s+/g, " ").slice(0, 320);
      throw new Error(`gemini_${response.status}${detail ? `:${detail}` : ""}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let answer = "";

    const consumeLine = (line: string) => {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) return;
      const data = trimmed.slice(5).trim();
      if (!data || data === "[DONE]") return;
      const text = extractGeminiText(data);
      if (!text) return;
      answer += text;
      onDelta(text);
    };

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || "";
      for (const line of lines) consumeLine(line);
    }

    buffer += decoder.decode();
    if (buffer.trim()) consumeLine(buffer);
    if (!answer.trim()) throw new Error(`gemini_empty_${role.id}`);
    return answer.trim();
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`gemini_timeout_${role.id}`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function extractConflictFlags(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.includes("[CONFLICT_FLAG]"))
    .map((line) => line.replace(/^[-*\s]*/, "").replace("[CONFLICT_FLAG]", "").trim())
    .filter(Boolean);
}

export async function POST(req: NextRequest) {
  let body: { question?: string; project?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const question = String(body.question || "").trim();
  const project = String(body.project || "amir-dev-brain").trim() || "amir-dev-brain";
  if (!question) return Response.json({ error: "question_required" }, { status: 400 });
  if (!geminiKey()) return Response.json({ error: "gemini_api_key_missing" }, { status: 503 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };

      const outputs: Partial<RoleOutputMap> = {};
      const conflictFlags: string[] = [];

      try {
        send({ type: "start", project, model: MODEL, council_version: "lite-v1" });

        for (const role of ROLES) {
          send({ type: "role_start", role: role.id, label: role.label });
          const answer = await streamRole(role, question, outputs, (text) => {
            send({ type: "delta", role: role.id, text });
          });
          outputs[role.id] = answer;

          if (role.id === "critic") {
            for (const detail of extractConflictFlags(answer)) {
              conflictFlags.push(detail);
              send({ type: "conflict", role: role.id, detail });
            }
          }

          send({ type: "role_done", role: role.id, text: answer });
        }

        const timestamp = new Date().toISOString();
        const synthesis = outputs.judge || "";
        send({
          type: "done",
          decision: {
            project,
            question,
            responses: {
              architect: outputs.architect || "",
              critic: outputs.critic || "",
              engineer: outputs.engineer || "",
              judge: outputs.judge || "",
            },
            conflict_flags: conflictFlags,
            synthesis,
            timestamp,
            status: "pending_approval",
            council_version: "lite-v1",
            model: MODEL,
          },
        });
      } catch (error) {
        send({
          type: "error",
          message: error instanceof Error ? error.message : "council_lite_failed",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      "x-accel-buffering": "no",
    },
  });
}
