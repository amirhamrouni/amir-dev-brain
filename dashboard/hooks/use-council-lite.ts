"use client";

import { useCallback, useMemo, useState } from "react";
import type { CouncilEvent, CouncilMessage, CouncilSynthesis } from "@/types/council";

export type CouncilLiteState = "idle" | "ready" | "running" | "error";

export type CouncilDecision = {
  project: string;
  question: string;
  responses: {
    architect: string;
    critic: string;
    engineer: string;
    judge: string;
  };
  conflict_flags: string[];
  synthesis: string;
  timestamp: string;
  status: "pending_approval";
  council_version: string;
  model?: string;
};

const LABELS: Record<string, { modelLabel: string; title: string; tone: "blue" | "red" }> = {
  architect: { modelLabel: "Architect", title: "المعمارية", tone: "blue" },
  critic: { modelLabel: "Critic", title: "النقد والاعتراض", tone: "red" },
  engineer: { modelLabel: "Engineer", title: "الهندسة والتنفيذ", tone: "blue" },
  judge: { modelLabel: "Judge", title: "الحكم والخلاصة", tone: "red" },
};

function nowLabel() {
  return new Date().toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" });
}

export function useCouncilLite() {
  const [events, setEvents] = useState<CouncilEvent[]>([]);
  const [state, setState] = useState<CouncilLiteState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [decision, setDecision] = useState<CouncilDecision | null>(null);

  const runDebate = useCallback(async ({ project, question }: { project: string; question: string }) => {
    setState("running");
    setError(null);
    setEvents([]);
    setDecision(null);

    const liveMessages = new Map<string, CouncilMessage>();
    let receivedDone = false;

    const handleEvent = (item: Record<string, any>) => {
      if (item.type === "role_start") {
        const meta = LABELS[item.role] || LABELS.architect;
        const message: CouncilMessage = {
          id: `council-lite-${item.role}`,
          modelLabel: meta.modelLabel,
          tone: meta.tone,
          title: meta.title,
          content: "",
          timestamp: nowLabel(),
        };
        liveMessages.set(item.role, message);
        setEvents((current) => [...current, { type: "message", message }]);
        return;
      }

      if (item.type === "delta") {
        const currentMessage = liveMessages.get(item.role);
        if (!currentMessage || typeof item.text !== "string") return;
        const updated: CouncilMessage = { ...currentMessage, content: currentMessage.content + item.text };
        liveMessages.set(item.role, updated);
        setEvents((current) =>
          current.map((event) =>
            event.type === "message" && event.message.id === updated.id
              ? { type: "message", message: updated }
              : event,
          ),
        );
        return;
      }

      if (item.type === "role_done") {
        const currentMessage = liveMessages.get(item.role);
        if (!currentMessage || typeof item.text !== "string") return;
        const updated: CouncilMessage = { ...currentMessage, content: item.text };
        liveMessages.set(item.role, updated);
        setEvents((current) =>
          current.map((event) =>
            event.type === "message" && event.message.id === updated.id
              ? { type: "message", message: updated }
              : event,
          ),
        );
        return;
      }

      if (item.type === "conflict" && typeof item.detail === "string") {
        setEvents((current) => [
          ...current,
          {
            type: "conflict",
            flag: {
              id: `council-conflict-${crypto.randomUUID()}`,
              code: "CONFLICT_FLAG",
              detail: item.detail,
              timestamp: nowLabel(),
            },
          },
        ]);
        return;
      }

      if (item.type === "done" && item.decision) {
        const nextDecision = item.decision as CouncilDecision;
        receivedDone = true;
        setDecision(nextDecision);
        const synthesis: CouncilSynthesis = {
          id: `council-lite-synthesis-${crypto.randomUUID()}`,
          title: "Synthesis · Judge",
          summary: nextDecision.synthesis.split(/\n\s*\n/)[0] || nextDecision.synthesis,
          recommendation: nextDecision.synthesis,
          confidence: 90,
        };
        setEvents((current) => [...current, { type: "synthesis", synthesis }]);
        setState("ready");
        return;
      }

      if (item.type === "error") {
        throw new Error(String(item.message || "council_lite_failed"));
      }
    };

    try {
      const response = await fetch("/api/council/run", {
        method: "POST",
        cache: "no-store",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ project, question }),
      });

      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => ({}));
        if (data?.error === "gemini_api_key_missing") {
          throw new Error("مفتاح Gemini غير مضبوط في بيئة Vercel الخاصة بـ Council Lite.");
        }
        throw new Error(String(data?.error || `Council Lite HTTP ${response.status}`));
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.trim()) continue;
          handleEvent(JSON.parse(line));
        }
      }

      buffer += decoder.decode();
      if (buffer.trim()) handleEvent(JSON.parse(buffer));
      if (!receivedDone) throw new Error("انقطع Stream قبل وصول Synthesis النهائية.");
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      setError(message);
      setState("error");
      throw cause;
    }
  }, []);

  const approveDecision = useCallback(
    async (accessKey: string) => {
      if (!decision) throw new Error("لا توجد نتيجة مجلس لاعتمادها.");
      const key = accessKey.trim();
      if (!key) throw new Error("أدخل مفتاح Open Brain للحفظ بعد الاعتماد.");

      const response = await fetch("/api/council/approve", {
        method: "POST",
        cache: "no-store",
        headers: {
          "content-type": "application/json",
          "x-brain-key": key,
        },
        body: JSON.stringify({ decision }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.ok) {
        throw new Error(
          data?.error === "open_brain_persist_failed"
            ? "فشل حفظ القرار في Open Brain، لكن نتيجة المجلس بقيت سليمة في الواجهة."
            : String(data?.error || "تعذر حفظ القرار في Open Brain."),
        );
      }
      return true;
    },
    [decision],
  );

  const latestSynthesis = useMemo<CouncilSynthesis | null>(() => {
    for (let index = events.length - 1; index >= 0; index -= 1) {
      const event = events[index];
      if (event.type === "synthesis") return event.synthesis;
    }
    return null;
  }, [events]);

  return { events, latestSynthesis, state, error, decision, runDebate, approveDecision };
}
