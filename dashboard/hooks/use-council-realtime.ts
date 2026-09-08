"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient, type RealtimeChannel, type SupabaseClient } from "@supabase/supabase-js";
import type { CouncilEvent, CouncilSynthesis, CouncilMessage } from "@/types/council";

export type RealtimeState = "idle" | "ready" | "running" | "error";

const COUNCIL_API = "https://hdcpvwsndxxflbednvsq.supabase.co/functions/v1/council-e2e-runner";
const MAX_REALTIME_WAIT_MS = 245_000;

function cleanProviderTitle(raw: string) {
  return raw.replace(/^#+\s*/, "").replace(/\s*\([^)]*\)\s*$/, "").trim();
}

function firstParagraph(text: string) {
  return text.split(/\n\s*\n/).map((part) => part.trim()).find(Boolean) || text.trim();
}

function parseCouncilTranscript(text: string): CouncilEvent[] {
  const cleaned = text.replace(/\nSaved to Open Brain thought:[\s\S]*$/i, "").trim();
  const matches = [...cleaned.matchAll(/^##\s+(Architecture Round \d+|Engineering Round \d+|Gemini Round \d+|OpenAI Round \d+|Council Synthesis)(?:\s+\(([^)]+)\))?\s*$/gmi)];
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
        id: `synthesis-${crypto.randomUUID()}`,
        title: "خلاصة المجلس",
        summary,
        recommendation: body,
        confidence: 96,
      };
      events.push({ type: "synthesis", synthesis });
      return;
    }

    const isArchitecture = /^(Architecture|Gemini)/i.test(title);
    const round = title.match(/(\d+)/)?.[1] || String(index + 1);
    const message: CouncilMessage = {
      id: `council-${crypto.randomUUID()}`,
      modelLabel: isArchitecture ? "جانب المعمارية" : "جانب الهندسة والتنفيذ",
      tone: isArchitecture ? "blue" : "red",
      title: `الجولة ${round}${provider ? ` · ${provider}` : ""}`,
      content: body,
      timestamp: now(),
    };
    events.push({ type: "message", message });

    if (/\b(disagree|conflict|risk|ضعف|خطر|تعارض|أختلف)\b/i.test(body)) {
      events.push({
        type: "conflict",
        flag: {
          id: `conflict-${crypto.randomUUID()}`,
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
        id: `council-result-${crypto.randomUUID()}`,
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
    if (typeof window !== "undefined") window.localStorage.removeItem("amir_mcp_access_key");
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
  const activeRef = useRef<{ client: SupabaseClient; channel: RealtimeChannel; timer: ReturnType<typeof setTimeout> } | null>(null);

  const cleanupActive = useCallback(async () => {
    const active = activeRef.current;
    activeRef.current = null;
    if (!active) return;
    clearTimeout(active.timer);
    await active.client.removeChannel(active.channel).catch(() => undefined);
  }, []);

  useEffect(() => () => { void cleanupActive(); }, [cleanupActive]);

  const runDebate = useCallback(async ({ project, question, rounds, accessKey }: { project: string; question: string; rounds: number; accessKey: string }) => {
    const normalizedKey = accessKey.trim();
    if (!normalizedKey) throw new Error("أدخل مفتاح الوصول الخاص أولاً.");

    await cleanupActive();
    setState("running");
    setError(null);
    setEvents([]);
    const runId = crypto.randomUUID();

    try {
      const response = await fetch(COUNCIL_API, {
        method: "POST",
        cache: "no-store",
        headers: { "content-type": "application/json", "x-amir-key": normalizedKey },
        body: JSON.stringify({ project_slug: project.trim() || "amir-dev-brain", question, rounds, run_id: runId }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.ok || !data?.accepted) {
        throw new Error(friendlyCouncilError(response.status, data?.error || data?.message));
      }
      if (!data?.realtime?.url || !data?.realtime?.anon_key) {
        throw new Error("لم يرجع الخادم إعداد Realtime اللازم لمتابعة المجلس.");
      }

      const client = createClient(data.realtime.url, data.realtime.anon_key, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      });
      const channelName = String(data.channel || `council:${runId}`);
      const channel = client.channel(channelName, { config: { broadcast: { self: false } } });

      const failRealtime = (message: string) => {
        setError(message);
        setState("error");
        void cleanupActive();
      };

      channel
        .on("broadcast", { event: "status" }, ({ payload }) => {
          if (payload?.run_id === runId && payload?.status === "started") setState("running");
        })
        .on("broadcast", { event: "transcript" }, ({ payload }) => {
          if (payload?.run_id !== runId || typeof payload?.text !== "string") return;
          const parsed = parseCouncilTranscript(payload.text);
          if (parsed.length) setEvents((current) => [...current, ...parsed]);
        })
        .on("broadcast", { event: "done" }, ({ payload }) => {
          if (payload?.run_id !== runId) return;
          setState("ready");
          void cleanupActive();
        })
        .on("broadcast", { event: "error" }, ({ payload }) => {
          if (payload?.run_id !== runId) return;
          failRealtime(String(payload?.message || "تعذّر إكمال نقاش المجلس."));
        });

      const timer = setTimeout(() => failRealtime("انتهت مهلة انتظار Realtime دون حدث ختامي من المجلس."), MAX_REALTIME_WAIT_MS);
      activeRef.current = { client, channel, timer };
      channel.subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") failRealtime("تعذّر فتح قناة Supabase Realtime للمجلس.");
      });

      return [] as CouncilEvent[];
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      setError(message);
      setState("error");
      await cleanupActive();
      throw cause;
    }
  }, [cleanupActive]);

  const latestSynthesis = useMemo<CouncilSynthesis | null>(() => {
    for (let index = events.length - 1; index >= 0; index -= 1) {
      const event = events[index];
      if (event.type === "synthesis") return event.synthesis;
    }
    return null;
  }, [events]);

  return { events, latestSynthesis, state, error, runDebate };
}
