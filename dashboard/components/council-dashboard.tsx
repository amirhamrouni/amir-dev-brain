"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Activity,
  BrainCircuit,
  CircleDot,
  Cpu,
  Database,
  KeyRound,
  LoaderCircle,
  Play,
  Radio,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { ConflictFlagBadge } from "@/components/conflict-flag";
import { ModelMessage } from "@/components/model-message";
import { SynthesisPanel } from "@/components/synthesis-panel";
import { useCouncilLite } from "@/hooks/use-council-lite";

const STATUS_LABEL = {
  idle: "Council Lite جاهز",
  ready: "اكتمل المجلس",
  running: "المجلس يفكّر الآن",
  error: "تعذّر تنفيذ النقاش",
} as const;

export function CouncilDashboard() {
  const [project, setProject] = useState("amir-dev-brain");
  const [topic, setTopic] = useState("تطوير معمارية Amir Dev Brain وتحسين نظام الذاكرة والمجلس");
  const [context, setContext] = useState(
    "حلّل السياق الحالي، تحدَّ الافتراضات، اكشف نقاط الضعف والتعارض، ثم قدّم خلاصة تنفيذية واضحة.",
  );
  const [accessKey, setAccessKey] = useState("");
  const [rememberKey, setRememberKey] = useState(false);
  const [followUp, setFollowUp] = useState("");

  const { events, latestSynthesis, state, error, runDebate, decision, approveDecision } = useCouncilLite();

  useEffect(() => {
    const saved = localStorage.getItem("amir_mcp_access_key") || "";
    if (saved) {
      setAccessKey(saved);
      setRememberKey(true);
    }
  }, []);

  useEffect(() => {
    if (!rememberKey) {
      localStorage.removeItem("amir_mcp_access_key");
      return;
    }
    if (accessKey.trim()) localStorage.setItem("amir_mcp_access_key", accessKey.trim());
  }, [accessKey, rememberKey]);

  const streamEvents = useMemo(() => events.filter((event) => event.type !== "synthesis"), [events]);
  const isRunning = state === "running";

  async function startDebate(extra = "") {
    const question = [
      `موضوع النقاش: ${topic}`,
      `السياق: ${context}`,
      extra ? `قيد أو سؤال إضافي: ${extra}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    await runDebate({ project, question }).catch(() => undefined);
  }

  async function submitFollowUp() {
    const value = followUp.trim();
    if (!value || isRunning) return;
    setFollowUp("");
    await startDebate(value);
  }

  return (
    <main className="brain-shell" dir="rtl">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark"><BrainCircuit size={22} /></div>
          <div>
            <p className="brand-name">عقل أمير التطويري</p>
            <p className="brand-subtitle">Council Lite · Gemini Streaming</p>
          </div>
        </div>
        <div className="topbar-status">
          <span className={`live-dot live-dot--${state}`} />
          <span>{STATUS_LABEL[state]}</span>
          <span className="topbar-divider" />
          <Cpu size={14} />
          <span>Gemini مباشر</span>
        </div>
      </header>

      <section className="workspace-grid">
        <aside className="context-pane">
          <div className="pane-heading">
            <div>
              <p className="eyebrow">المدخلات والسياق</p>
              <h1>افتح نقاشاً محكوماً</h1>
            </div>
            <div className="context-icon"><BrainCircuit size={19} /></div>
          </div>

          <div className="context-card">
            <label className="field-label">المشروع</label>
            <div className="input-shell">
              <Database size={15} />
              <input value={project} onChange={(event) => setProject(event.target.value)} />
            </div>

            <label className="field-label">موضوع النقاش</label>
            <div className="input-shell">
              <CircleDot size={15} />
              <input value={topic} onChange={(event) => setTopic(event.target.value)} />
            </div>

            <div className="field-row">
              <label className="field-label">سياق المجلس</label>
              <span className="field-hint">{context.length}/900</span>
            </div>
            <textarea maxLength={900} value={context} onChange={(event) => setContext(event.target.value)} rows={7} />

            <label className="field-label key-label">مفتاح Open Brain للحفظ فقط</label>
            <div className="input-shell key-shell">
              <KeyRound size={15} />
              <input
                type="password"
                autoComplete="off"
                placeholder="لا يلزم لتشغيل المجلس"
                value={accessKey}
                onChange={(event) => setAccessKey(event.target.value)}
              />
            </div>
            <label className="remember-key">
              <input type="checkbox" checked={rememberKey} onChange={(event) => setRememberKey(event.target.checked)} />
              <span>حفظ المفتاح على هذا الجهاز</span>
            </label>

            <div className="round-control">
              <div>
                <span className="field-label">Council Lite v1</span>
                <p>Architect → Critic → Engineer → Judge</p>
              </div>
              <strong>4 أدوار</strong>
            </div>

            <motion.button
              className="run-button"
              disabled={isRunning}
              type="button"
              whileHover={isRunning ? undefined : { y: -2 }}
              whileTap={isRunning ? undefined : { scale: 0.985 }}
              onClick={() => void startDebate()}
            >
              {isRunning ? <LoaderCircle className="spin" size={17} /> : <Play size={16} fill="currentColor" />}
              {isRunning ? "النقاش يبث الآن..." : "بدء Council Lite"}
              <span>Streaming مباشر</span>
            </motion.button>
            {error ? <div className="engine-error">{error}</div> : null}
          </div>

          <div className="memory-strip">
            <div className="memory-strip__icon"><BrainCircuit size={16} /></div>
            <div>
              <strong>Open Brain معزول عن التوليد</strong>
              <span>يُستخدم فقط بعد الضغط على اعتماد النتيجة</span>
            </div>
            <ShieldCheck size={13} />
          </div>
          <div className="context-footer"><Radio size={14} />المحرك: <code>council-lite-v1</code></div>
        </aside>

        <section className="debate-pane">
          <div className="debate-toolbar">
            <div>
              <p className="eyebrow">النقاش الحي</p>
              <div className="thread-title-row">
                <h2>{topic || "مجلس جديد"}</h2>
                <span className="round-pill">4 أدوار</span>
              </div>
            </div>
            <div className="stream-health">
              <Activity size={15} />
              <span>{isRunning ? "Streaming..." : `${streamEvents.length} حدث`}</span>
            </div>
          </div>

          <div className="thread-scroll">
            <div className="thread-line" aria-hidden="true" />
            {!streamEvents.length && !isRunning ? (
              <div className="empty-brain">
                <BrainCircuit size={34} />
                <strong>المجلس جاهز</strong>
                <span>ابدأ وستظهر ردود الأدوار تباعاً أثناء التوليد.</span>
              </div>
            ) : null}

            <AnimatePresence initial={false}>
              {streamEvents.map((event, index) =>
                event.type === "message" ? (
                  <ModelMessage key={event.message.id} message={event.message} index={index} />
                ) : event.type === "conflict" ? (
                  <motion.div
                    key={event.flag.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="conflict-event"
                  >
                    <ConflictFlagBadge detail={event.flag.detail} />
                    <span>{event.flag.timestamp}</span>
                  </motion.div>
                ) : null,
              )}
            </AnimatePresence>
          </div>

          <div className="synthesis-wrap">
            <SynthesisPanel
              synthesis={latestSynthesis}
              onApprove={
                decision
                  ? async () => {
                      await approveDecision(accessKey);
                    }
                  : undefined
              }
            />
          </div>

          <div className="composer-shell">
            <Sparkles size={16} />
            <input
              value={followUp}
              onChange={(event) => setFollowUp(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void submitFollowUp();
              }}
              placeholder="أضف قيداً أو اطلب تحدي نقطة محددة..."
            />
            <button type="button" disabled={isRunning || !followUp.trim()} onClick={() => void submitFollowUp()}>
              <Send size={16} />
            </button>
          </div>
        </section>
      </section>
    </main>
  );
}
