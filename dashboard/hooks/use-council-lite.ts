"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { CouncilEvent, CouncilMessage, CouncilSynthesis } from "@/types/council";

export type CouncilLiteState = "idle" | "ready" | "running" | "error";

type StreamRole = "Architect" | "Critic" | "Engineer" | "Judge";
type RoleKey = "architect" | "critic" | "engineer" | "judge";

type ParsedStream = Partial<Record<StreamRole, string>> & { Error?: string };

export type CouncilDecision = {
  project: string;
  question: string;
  responses: Record<RoleKey, string>;
  conflict_flags: string[];
  synthesis: string;
  timestamp: string;
  status: "pending_approval";
  council_version: string;
  model?: string;
};

export type ApprovalReceipt = {
  decisionId: string;
  vectorStatus: "PENDING" | "INDEXED" | "FAILED";
};

const LABELS: Record<StreamRole, { key: RoleKey; modelLabel: string; title: string; tone: "blue" | "red" }> = {
  Architect: { key: "architect", modelLabel: "Architect · Gemini", title: "المعمارية", tone: "blue" },
  Critic: { key: "critic", modelLabel: "Critic · Gemini", title: "النقد والاعتراض", tone: "red" },
  Engineer: { key: "engineer", modelLabel: "Engineer · GPT-4o mini", title: "الهندسة والتنفيذ", tone: "blue" },
  Judge: { key: "judge", modelLabel: "Judge · Gemini", title: "الحكم والخلاصة", tone: "red" },
};

const ROLE_ORDER: StreamRole[] = ["Architect", "Critic", "Engineer", "Judge"];
const HEADER_RE = /\n\n═+\n### (Architect|Critic|Engineer|Judge|Error)\n═+\n\n/g;

function nowLabel() {
  return new Date().toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" });
}

function trimPossiblePartialHeader(content: string) {
  const marker = content.lastIndexOf("\n\n═");
  if (marker === -1) return content;
  const tail = content.slice(marker);
  return tail.length < 140 ? content.slice(0, marker) : content;
}

function parseStreamText(text: string): ParsedStream {
  const matches = Array.from(text.matchAll(HEADER_RE));
  const parsed: ParsedStream = {};

  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const role = match[1] as StreamRole | "Error";
    const start = (match.index ?? 0) + match[0].length;
    const end = matches[index + 1]?.index ?? text.length;
    parsed[role] = trimPossiblePartialHeader(text.slice(start, end));
  }

  return parsed;
}

function extractConflicts(critic = "") {
  return critic
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.includes("[CONFLICT]"))
    .map((line) => line.replace(/^[-*\s]*/, "").replace("[CONFLICT]", "").trim())
    .filter(Boolean);
}

function cleanSynthesis(judge = "") {
  const marker = judge.indexOf("[SYNTHESIS]");
  return (marker >= 0 ? judge.slice(marker + "[SYNTHESIS]".length) : judge).trim();
}

export function useCouncilLite() {
  const [events, setEvents] = useState<CouncilEvent[]>([]);
  const [state, setState] = useState<CouncilLiteState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [decision, setDecision] = useState<CouncilDecision | null>(null);
  const timestamps = useRef<Partial<Record<StreamRole, string>>>({});

  const renderParsedStream = useCallback((parsed: ParsedStream, includeSynthesis = false) => {
    const nextEvents: CouncilEvent[] = [];

    for (const role of ROLE_ORDER) {
      const content = parsed[role];
      if (content === undefined) continue;
      const meta = LABELS[role];
      const timestamp = timestamps.current[role] || nowLabel();
      timestamps.current[role] = timestamp;

      const message: CouncilMessage = {
        id: `council-lite-${meta.key}`,
        modelLabel: meta.modelLabel,
        tone: meta.tone,
        title: meta.title,
        content,
        timestamp,
      };
      nextEvents.push({ type: "message", message });

      if (role === "Critic") {
        for (const [index, detail] of extractConflicts(content).entries()) {
          nextEvents.push({
            type: "conflict",
            flag: {
              id: `council-conflict-${index}`,
              code: "CONFLICT_FLAG",
              detail,
              timestamp,
            },
          });
        }
      }
    }

    if (includeSynthesis && parsed.Judge !== undefined) {
      const recommendation = cleanSynthesis(parsed.Judge);
      if (recommendation) {
        const synthesis: CouncilSynthesis = {
          id: "council-lite-synthesis",
          title: "Synthesis · Judge",
          summary: recommendation.split(/\n\s*\n/)[0] || recommendation,
          recommendation,
          confidence: 90,
        };
        nextEvents.push({ type: "synthesis", synthesis });
      }
    }

    setEvents(nextEvents);
  }, []);

  const runDebate = useCallback(
    async ({ project, question }: { project: string; question: string }) => {
      setState("running");
      setError(null);
      setEvents([]);
      setDecision(null);
      timestamps.current = {};

      try {
        const response = await fetch("/api/council/run", {
          method: "POST",
          cache: "no-store",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ userQuery: question }),
        });

        if (!response.ok || !response.body) {
          const data = (await response.json().catch(() => ({}))) as { error?: string };
          if (data.error === "gemini_api_key_missing") {
            throw new Error("مفتاح Gemini غير مضبوط في بيئة Vercel الخاصة بـ Council v1.5.");
          }
          if (data.error === "openai_api_key_missing") {
            throw new Error("مفتاح OpenAI غير مضبوط بعد. أضف OPENAI_API_KEY لتفعيل مقعد Engineer في Council v1.5.");
          }
          throw new Error(data.error || `Council v1.5 HTTP ${response.status}`);
        }

        const modelName = response.headers.get("x-council-model") || undefined;
        const councilVersion = response.headers.get("x-council-version") || "v1.5";
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          fullText += decoder.decode(value, { stream: true });
          const parsed = parseStreamText(fullText);
          renderParsedStream(parsed, false);
          if (parsed.Error?.trim()) {
            setError(parsed.Error.trim());
          }
        }

        fullText += decoder.decode();
        const parsed = parseStreamText(fullText);
        renderParsedStream(parsed, true);

        if (parsed.Error?.trim()) {
          throw new Error(parsed.Error.trim());
        }

        const architect = parsed.Architect?.trim() || "";
        const critic = parsed.Critic?.trim() || "";
        const engineer = parsed.Engineer?.trim() || "";
        const judge = parsed.Judge?.trim() || "";
        const synthesis = cleanSynthesis(judge);

        if (!architect || !critic || !engineer || !judge || !synthesis) {
          throw new Error("انقطع Stream قبل اكتمال أدوار المجلس والخلاصة النهائية.");
        }

        const nextDecision: CouncilDecision = {
          project,
          question,
          responses: { architect, critic, engineer, judge },
          conflict_flags: extractConflicts(critic),
          synthesis,
          timestamp: new Date().toISOString(),
          status: "pending_approval",
          council_version: councilVersion,
          model: modelName,
        };

        setDecision(nextDecision);
        setState("ready");
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : String(cause);
        setError(message);
        setState("error");
        throw cause;
      }
    },
    [renderParsedStream],
  );

  const approveDecision = useCallback(
    async (accessKey: string): Promise<ApprovalReceipt> => {
      if (!decision) throw new Error("لا توجد نتيجة مجلس لاعتمادها.");
      const key = accessKey.trim();
      if (!key) throw new Error("أدخل مفتاح اعتماد الذاكرة الدائمة.");

      const response = await fetch("/api/council/approve", {
        method: "POST",
        cache: "no-store",
        headers: {
          "content-type": "application/json",
          "x-brain-key": key,
        },
        body: JSON.stringify({ decision }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        decision_id?: string;
        vector_status?: ApprovalReceipt["vectorStatus"];
      };

      if (!response.ok || !data.ok) {
        const message =
          data.error === "approval_key_not_configured"
            ? "مفتاح اعتماد الذاكرة غير مضبوط في Vercel. اضبط COUNCIL_APPROVE_KEY أو MCP_ACCESS_KEY."
            : data.error === "approval_auth_failed"
              ? "مفتاح اعتماد الذاكرة غير صحيح."
              : data.error === "decision_persist_failed"
                ? "فشل حفظ القرار في الذاكرة الدائمة. لم يتم اعتباره محفوظاً."
                : data.error || "تعذر حفظ القرار في الذاكرة الدائمة.";
        throw new Error(message);
      }

      if (!data.decision_id || !data.vector_status) {
        throw new Error("تمت الاستجابة دون معرّف قرار أو vector_status صالح.");
      }

      return {
        decisionId: data.decision_id,
        vectorStatus: data.vector_status,
      };
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
