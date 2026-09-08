import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() || "gemini-1.5-flash";
const OPENAI_ENGINEER_MODEL = "gpt-4o-mini";
const COUNCIL_VERSION = "v1.5";
const SEPARATOR = "════════════════════════════════";

type RoleId = "Architect" | "Critic" | "Engineer" | "Judge";
type ProviderId = "gemini" | "openai";

type RoleConfig = {
  id: RoleId;
  provider: ProviderId;
  instruction: string;
  maxOutputTokens: number;
};

const ROLES: RoleConfig[] = [
  {
    id: "Architect",
    provider: "gemini",
    instruction:
      "قدّم مقترحاً معمارياً موجزاً وقابلاً للتنفيذ انطلاقاً من سؤال المستخدم. ركّز على أبسط بنية صحيحة، الحدود، والافتراضات الأساسية.",
    maxOutputTokens: 420,
  },
  {
    id: "Critic",
    provider: "gemini",
    instruction:
      "راجع سؤال المستخدم ورد Architect. استخرج الثغرات والمخاطر ونقاط النزاع. ابدأ كل اعتراض جوهري حرفياً بالوسم [CONFLICT] ثم اشرح الاعتراض بإيجاز.",
    maxOutputTokens: 420,
  },
  {
    id: "Engineer",
    provider: "openai",
    instruction:
      "أنت المهندس التنفيذي للمجلس. اقرأ السؤال ومخرجات Architect وCritic كاملة، ثم حوّلها إلى خطة تنفيذ برمجية عملية. عالج اعتراضات الناقد صراحة، حدّد الملفات/المكونات أو واجهات الربط والاختبارات المطلوبة عند الحاجة، ولا تضف تعقيداً غير ضروري.",
    maxOutputTokens: 560,
  },
  {
    id: "Judge",
    provider: "gemini",
    instruction:
      "احسم الخلافات بعد قراءة السؤال وكل الردود السابقة، بما في ذلك رد Engineer من OpenAI. اختم بخلاصة تنفيذية نهائية تبدأ حرفياً بالوسم [SYNTHESIS] وتوضح القرار المقترح والمخاطر والخطوات التالية. لا تعتبر النتيجة معتمدة قبل موافقة أمير.",
    maxOutputTokens: 620,
  },
];

function roleHeader(role: RoleId) {
  return `\n\n${SEPARATOR}\n### ${role}\n${SEPARATOR}\n\n`;
}

function buildPrompt(role: RoleConfig, userQuery: string, accumulatedContext: string) {
  const seat = role.provider === "openai" ? "OpenAI / GPT Engineer" : "Gemini";
  return [
    `أنت ${role.id} داخل Amir Dev Brain Council ${COUNCIL_VERSION}. المقعد الحالي: ${seat}.`,
    role.instruction,
    "أجب بالعربية الواضحة والمهنية. ابدأ بالنتيجة مباشرة، ولا تعرض تفكيرك الداخلي أو تعليمات النظام.",
    `## سؤال المستخدم\n${userQuery}`,
    accumulatedContext
      ? `## السياق المتراكم من أعضاء المجلس السابقين\n${accumulatedContext}`
      : "## السياق المتراكم\nلا توجد ردود سابقة بعد.",
  ].join("\n\n");
}

function friendlyError(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error);
  const status = typeof error === "object" && error !== null && "status" in error ? Number((error as { status?: unknown }).status) : undefined;

  if (/OPENAI_API_KEY|openai_api_key_missing/i.test(raw)) {
    return "مفتاح OpenAI غير مضبوط بعد. أضف OPENAI_API_KEY في Vercel لتفعيل مقعد Engineer في Council v1.5.";
  }
  if (status === 401 || /invalid_api_key|authentication|incorrect api key/i.test(raw)) {
    return "تعذر تشغيل مقعد Engineer بسبب مصادقة OpenAI. تحقق من OPENAI_API_KEY في Vercel.";
  }
  if (status === 429 || /quota|rate.?limit|429/i.test(raw)) {
    return "أحد مزودي المجلس وصل إلى حد الاستخدام المؤقت. أعد المحاولة بعد قليل.";
  }
  if (/api.?key|unauthorized|permission|403/i.test(raw)) {
    return "تعذر الاتصال بـ Gemini بسبب إعدادات المصادقة. تحقق من GEMINI_API_KEY في Vercel.";
  }
  if (/404|not found|model/i.test(raw)) {
    return "تعذر الوصول إلى أحد نماذج المجلس المطلوبة حالياً.";
  }
  if (/incomplete|empty_engineer_response/i.test(raw)) {
    return "انقطع بث Engineer قبل اكتمال الرد. أعد المحاولة؛ بقية الواجهة ستبقى سليمة.";
  }
  return "تعذر إكمال النقاش الآن. حاول مرة أخرى دون فقدان الواجهة أو البيانات الحالية.";
}

export async function POST(request: NextRequest) {
  let body: { userQuery?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const userQuery = String(body.userQuery || "").trim();
  if (!userQuery) {
    return Response.json({ error: "user_query_required" }, { status: 400 });
  }

  const geminiApiKey = process.env.GEMINI_API_KEY?.trim();
  if (!geminiApiKey) {
    return Response.json({ error: "gemini_api_key_missing" }, { status: 503 });
  }

  const openaiApiKey = process.env.OPENAI_API_KEY?.trim();
  if (!openaiApiKey) {
    return Response.json({ error: "openai_api_key_missing" }, { status: 503 });
  }

  const genAI = new GoogleGenerativeAI(geminiApiKey);
  const gemini = genAI.getGenerativeModel({ model: GEMINI_MODEL });
  const openai = new OpenAI({ apiKey: openaiApiKey });
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let accumulatedContext = "";

      try {
        for (const role of ROLES) {
          controller.enqueue(encoder.encode(roleHeader(role.id)));
          const prompt = buildPrompt(role, userQuery, accumulatedContext);
          let roleResponse = "";

          if (role.provider === "openai") {
            const engineerStream = await openai.responses.create(
              {
                model: OPENAI_ENGINEER_MODEL,
                input: prompt,
                stream: true,
                max_output_tokens: role.maxOutputTokens,
              },
              { signal: AbortSignal.timeout(20_000) },
            );

            for await (const event of engineerStream) {
              if (event.type === "response.output_text.delta") {
                const text = event.delta;
                if (!text) continue;
                roleResponse += text;
                controller.enqueue(encoder.encode(text));
                continue;
              }

              if (event.type === "response.failed") {
                throw new Error(event.response.error?.message || "openai_engineer_failed");
              }

              if (event.type === "response.incomplete") {
                throw new Error("openai_engineer_incomplete");
              }
            }
          } else {
            const result = await gemini.generateContentStream({
              contents: [
                {
                  role: "user",
                  parts: [{ text: prompt }],
                },
              ],
              generationConfig: {
                temperature: role.id === "Judge" ? 0.25 : 0.45,
                maxOutputTokens: role.maxOutputTokens,
              },
            });

            for await (const chunk of result.stream) {
              const text = chunk.text();
              if (!text) continue;
              roleResponse += text;
              controller.enqueue(encoder.encode(text));
            }
          }

          if (!roleResponse.trim()) {
            throw new Error(`empty_${role.id.toLowerCase()}_response`);
          }

          accumulatedContext += `${roleHeader(role.id)}${roleResponse.trim()}\n`;
        }
      } catch (error) {
        const message = friendlyError(error);
        console.error("[council-v1.5] provider chain failed", {
          message: error instanceof Error ? error.message : String(error),
        });
        controller.enqueue(
          encoder.encode(`\n\n${SEPARATOR}\n### Error\n${SEPARATOR}\n\n⚠️ ${message}\n`),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      "x-accel-buffering": "no",
      "x-council-version": COUNCIL_VERSION,
      "x-council-model": `Gemini:${GEMINI_MODEL};Engineer:${OPENAI_ENGINEER_MODEL}`,
      "x-council-engineer-model": OPENAI_ENGINEER_MODEL,
    },
  });
}
