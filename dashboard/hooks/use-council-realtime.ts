"use client";

import { useCallback, useMemo, useState } from "react";
import type { CouncilEvent, CouncilSynthesis, CouncilMessage } from "@/types/council";

export type RealtimeState = "idle" | "ready" | "running" | "error";
export type CouncilDecision = { project: string; question: string; transcript: string; final: string; status: "pending_approval"; created_at: string; council_version: string };

const labels: Record<string, { modelLabel: string; title: string; tone: "blue" | "red" }> = {
  architect: { modelLabel: "Architect", title: "المعمارية", tone: "blue" },
  critic: { modelLabel: "Critic", title: "النقد والاعتراض", tone: "red" },
  engineer: { modelLabel: "Engineer", title: "الهندسة والتنفيذ", tone: "blue" },
  judge: { modelLabel: "Judge", title: "الحكم والخلاصة", tone: "red" },
};

export function useCouncilRealtime() {
  const [events, setEvents] = useState<CouncilEvent[]>([]);
  const [state, setState] = useState<RealtimeState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [decision, setDecision] = useState<CouncilDecision | null>(null);

  const runDebate = useCallback(async ({ project, question }: { project: string; question: string; rounds: number; accessKey: string }) => {
    setState("running"); setError(null); setEvents([]); setDecision(null);
    const live = new Map<string, CouncilMessage>();
    try {
      const response = await fetch("/api/council/run", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ project, question }) });
      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error === "gemini_api_key_missing" ? "مفتاح Gemini غير مضبوط على خادم Council Lite." : `Council Lite HTTP ${response.status}`);
      }
      const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = "";
      while (true) {
        const { value, done } = await reader.read(); if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n"); buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const item = JSON.parse(line);
          if (item.type === "role_start") {
            const meta = labels[item.role] || labels.architect;
            const msg: CouncilMessage = { id: `lite-${item.role}`, modelLabel: meta.modelLabel, tone: meta.tone, title: meta.title, content: "", timestamp: new Date().toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" }) };
            live.set(item.role, msg); setEvents((current) => [...current, { type: "message", message: msg }]);
          } else if (item.type === "delta") {
            const msg = live.get(item.role); if (!msg) continue;
            const updated = { ...msg, content: msg.content + item.text }; live.set(item.role, updated);
            setEvents((current) => current.map((event) => event.type === "message" && event.message.id === updated.id ? { type: "message", message: updated } : event));
          } else if (item.type === "done") {
            setDecision(item.decision);
            const synthesis: CouncilSynthesis = { id: `lite-synthesis-${crypto.randomUUID()}`, title: "خلاصة Judge", summary: item.decision.final.split(/\n\s*\n/)[0] || item.decision.final, recommendation: item.decision.final, confidence: 90 };
            setEvents((current) => [...current, { type: "synthesis", synthesis }]); setState("ready");
          } else if (item.type === "error") throw new Error(item.message || "Council Lite failed");
        }
      }
      return [] as CouncilEvent[];
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause); setError(message); setState("error"); throw cause;
    }
  }, []);

  const approveDecision = useCallback(async (accessKey: string) => {
    if (!decision) throw new Error("لا توجد نتيجة لاعتمادها.");
    const response = await fetch("https://hdcpvwsndxxflbednvsq.supabase.co/functions/v1/open-brain-mcp", { method: "POST", headers: { "content-type": "application/json", "x-brain-key": accessKey.trim() }, body: JSON.stringify({ jsonrpc: "2.0", id: crypto.randomUUID(), method: "tools/call", params: { name: "capture_thought", arguments: { content: JSON.stringify({ ...decision, status: "approved" }, null, 2), project: decision.project, source: "council-lite-approved" } } }) });
    if (!response.ok) throw new Error("فشل حفظ القرار في Open Brain، لكن نتيجة المجلس مازالت محفوظة في الواجهة.");
    const text = await response.text(); if (/unauthorized|error/i.test(text)) throw new Error("Open Brain رفض الحفظ، لكن المجلس يعمل بشكل مستقل.");
    return true;
  }, [decision]);

  const latestSynthesis = useMemo<CouncilSynthesis | null>(() => { for (let i = events.length - 1; i >= 0; i--) if (events[i].type === "synthesis") return events[i].synthesis; return null; }, [events]);
  return { events, latestSynthesis, state, error, runDebate, decision, approveDecision };
}
