"use client";

import { useCallback, useMemo, useState } from "react";
import type { CouncilEvent, CouncilSynthesis, CouncilMessage } from "@/types/council";

export type RealtimeState = "idle" | "ready" | "running" | "error";

const COUNCIL_API = "https://hdcpvwsndxxflbednvsq.supabase.co/functions/v1/council-e2e-runner";

function cleanProviderTitle(raw: string) {
  return raw.replace(/^#+\s*/, "").replace(/\s*\([^)]*\)\s*$/, "").trim();
}

function firstParagraph(text: string) {
  return text.split(/\n\s*\n/).map((part) => part.trim()).find(Boolean) || text.trim();
}

function parseCouncilTranscript(text: string): CouncilEvent[] {
  const cleaned = text.replace(/\nSaved to Open Brain thought:[\s\S]*$/i, "").trim();
  const matches = [...cleaned.matchAll(/^##\s+(Gemini Round \d+|OpenAI Round \d+|Council Synthesis)(?:\s+\(([^)]+)\))?\s*$/gmi)];
  const now = () => new Date().toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" });
  const events: CouncilEvent[] = [];

  matches.forEach((match, index) => {
    const start = (match.index || 0) + match[0].length;
    const end = index + 1 < matches.length ? (matches[index + 1].index || cleaned.length) : cleaned.length;
    const body = cleaned.slice(start, end).trim();
    const title = cleanProviderTitle(match[1]);
    const provider = match[2]?.trim();

    if (/Council Synthesis/i.test(title)) {
      const summary = firstParagraph(body);
      const synthesis: CouncilSynthesis = {
        id: `synthesis-${Date.now()}`,
        title: "خلاصة المجلس",
        summary,
        recommendation: body,
        confidence: 96,
      };
      events.push({ type: "synthesis", synthesis });
      return;
    }

    const isGemini = /^Gemini/i.test(title);
    const round = title.match(/(\d+)/)?.[1] || String(index + 1);
    const message: CouncilMessage = {
      id: `council-${index}-${Date.now()}`,
      modelLabel: isGemini ? "نموذج جيميني" : "نموذج OpenAI",
      tone: isGemini ? "blue" : "red",
      title: `الجولة ${round}${provider ? ` · ${provider}` : ""}`,
      content: body,
      timestamp: now(),
    };
    events.push({ type: "message", message });

    if (/\b(disagree|conflict|risk|ضعف|خطر|تعارض|أختلف)\b/i.test(body)) {
      events.push({
        type: "conflict",
        flag: {
          id: `conflict-${index}-${Date.now()}`,
          code: "COUNCIL_CONFLICT",
          detail: "رُصد اعتراض أو خطر يحتاج للمراجعة داخل هذه الجولة.",
          timestamp: now(),
        },
      });
    }
  });

  if (!events.length && cleaned) {
    events.push({
      type: "message",
      message: {
        id: `council-result-${Date.now()}`,
        modelLabel: "محرك المجلس",
        tone: "blue",
        title: "نتيجة النقاش",
        content: cleaned,
        timestamp: now(),
      },
    });
  }

  return events;
}

function friendlyCouncilError(status: number, raw: unknown) {
  const message = typeof raw === "string" ? raw : "";
  if (status === 401 || /unauthorized|auth_key_mismatch/i.test(message)) {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("amir_mcp_access_key");
    }
    return "مفتاح الوصول المحفوظ قديم أو غير مطابق. تم مسحه من هذا الجهاز. أدخل MCP_ACCESS_KEY الحالي ثم أعد المحاولة.";
  }
  if (/MCP_ACCESS_KEY missing/i.test(message)) {
    return "مفتاح MCP_ACCESS_KEY غير مضبوط على الخادم. يلزم مزامنة سر Supabase قبل تشغيل المجلس.";
  }
  return message || `فشل الاتصال بالمجلس (HTTP ${status}).`;
}

export function useCouncilRealtime() {
  const [events, setEvents] = useState<CouncilEvent[]>([]);
  const [state, setState] = useState<RealtimeState>("idle");
  const [error, setError] = useState<string | null>(null);

  const runDebate = useCallback(async ({ project, question, rounds, accessKey }: { project: string; question: string; rounds: number; accessKey: string }) => {
    const normalizedKey = accessKey.trim();
    if (!normalizedKey) throw new Error("أدخل مفتاح الوصول الخاص أولاً.");
    setState("running");
    setError(null);
    setEvents([]);

    try {
      const response = await fetch(COUNCIL_API, {
        method: "POST",
        cache: "no-store",
        headers: {
          "content-type": "application/json",
          "x-amir-key": normalizedKey,
        },
        body: JSON.stringify({ project_slug: project.trim() || "amir-dev-brain", question, rounds }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.ok) {
        throw new Error(friendlyCouncilError(response.status, data?.error));
      }
      const text = (data?.result?.content || [])
        .filter((item: unknown) => item && typeof item === "object" && "text" in item)
        .map((item: { text?: unknown }) => String(item.text || ""))
        .join("\n");
      const parsed = parseCouncilTranscript(text);
      setEvents(parsed);
      setState("ready");
      return parsed;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      setError(message);
      setState("error");
      throw cause;
    }
  }, []);

  const latestSynthesis = useMemo<CouncilSynthesis | null>(() => {
    for (let index = events.length - 1; index >= 0; index -= 1) {
      const event = events[index];
      if (event.type === "synthesis") return event.synthesis;
    }
    return null;
  }, [events]);

  return { events, latestSynthesis, state, error, runDebate };
}
