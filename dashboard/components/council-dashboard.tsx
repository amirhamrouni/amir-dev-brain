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
import { useCouncilRealtime } from "@/hooks/use-council-realtime";

const STATUS_LABEL = {
  idle: "بانتظار مفتاح الوصول",
  ready: "المحرك متصل",
  running: "المجلس يفكّر الآن",
  error: "تعذّر تنفيذ النقاش",
} as const;

const NEURAL_NODES = [
  [8, 21], [19, 9], [31, 27], [44, 13], [55, 34], [67, 16], [79, 29], [91, 11],
  [13, 58], [27, 46], [39, 66], [52, 52], [64, 70], [76, 51], [88, 64],
  [18, 88], [36, 83], [53, 91], [71, 86], [92, 89],
];
const NEURAL_LINKS = [[0,1],[0,8],[1,2],[2,3],[2,9],[3,4],[4,5],[4,11],[5,6],[6,7],[6,13],[8,9],[8,15],[9,10],[10,11],[10,16],[11,12],[11,13],[12,13],[12,17],[13,14],[14,19],[15,16],[16,17],[17,18],[18,19]];

function NeuralBackdrop() {
  return (
    <div className="neural-backdrop" aria-hidden="true">
      <motion.svg viewBox="0 0 100 100" preserveAspectRatio="none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.2 }}>
        <defs>
          <linearGradient id="neuralLine" x1="0" x2="1">
            <stop offset="0" stopColor="#3b82f6" stopOpacity=".15" />
            <stop offset=".5" stopColor="#8b5cf6" stopOpacity=".32" />
            <stop offset="1" stopColor="#22d3ee" stopOpacity=".12" />
          </linearGradient>
        </defs>
        {NEURAL_LINKS.map(([from, to], index) => (
          <motion.line
            key={`l-${index}`}
            x1={NEURAL_NODES[from][0]} y1={NEURAL_NODES[from][1]}
            x2={NEURAL_NODES[to][0]} y2={NEURAL_NODES[to][1]}
            stroke="url(#neuralLine)" strokeWidth=".15"
            animate={{ opacity: [.16, .55, .16] }}
            transition={{ duration: 3.8 + (index % 4), repeat: Infinity, delay: index * .08 }}
          />
        ))}
        {NEURAL_NODES.map(([x, y], index) => (
          <motion.circle
            key={`n-${index}`} cx={x} cy={y} r=".48" fill={index % 3 === 0 ? "#22d3ee" : index % 2 === 0 ? "#8b5cf6" : "#3b82f6"}
            animate={{ r: [.34, .7, .34], opacity: [.35, .9, .35] }}
            transition={{ duration: 2.6 + (index % 5) * .35, repeat: Infinity, delay: index * .11 }}
          />
        ))}
      </motion.svg>
    </div>
  );
}

export function CouncilDashboard() {
  const [project, setProject] = useState("amir-dev-brain");
  const [topic, setTopic] = useState("تطوير معمارية Amir Dev Brain وتحسين نظام الذاكرة والمجلس");
  const [context, setContext] = useState("حلّل السياق الحالي، تحدَّ الافتراضات، اكشف نقاط الضعف والتعارض، ثم قدّم خلاصة تنفيذية واضحة مع المزايا والمخاطر وما يحتاج موافقة أمير.");
  const [rounds, setRounds] = useState(2);
  const [accessKey, setAccessKey] = useState("");
  const [rememberKey, setRememberKey] = useState(false);
  const [followUp, setFollowUp] = useState("");
  const { events, latestSynthesis, state, error, runDebate } = useCouncilRealtime();

  useEffect(() => {
    const saved = window.localStorage.getItem("amir_mcp_access_key") || "";
    if (saved) {
      setAccessKey(saved);
      setRememberKey(true);
    }
  }, []);

  useEffect(() => {
    if (!rememberKey) {
      window.localStorage.removeItem("amir_mcp_access_key");
      return;
    }
    if (accessKey.trim()) window.localStorage.setItem("amir_mcp_access_key", accessKey.trim());
  }, [accessKey, rememberKey]);

  const streamEvents = useMemo(() => events.filter((event) => event.type !== "synthesis"), [events]);
  const isRunning = state === "running";

  async function startDebate(extra = "") {
    const question = [
      "أجب بالعربية الفصحى الواضحة. أنت داخل مجلس نماذج Amir Dev Brain. لا تعتبر أي توصية قراراً معتمداً قبل موافقة أمير.",
      `موضوع النقاش: ${topic}`,
      `السياق: ${context}`,
      extra ? `قيد أو سؤال إضافي: ${extra}` : "",
    ].filter(Boolean).join("\n\n");
    await runDebate({ project, question, rounds, accessKey }).catch(() => undefined);
  }

  async function submitFollowUp() {
    const value = followUp.trim();
    if (!value || isRunning) return;
    setFollowUp("");
    await startDebate(value);
  }

  return (
    <main className="brain-shell" dir="rtl">
      <NeuralBackdrop />
      <div className="neural-core neural-core--one" />
      <div className="neural-core neural-core--two" />

      <header className="topbar">
        <div className="brand-lockup">
          <motion.div className="brand-mark" animate={{ boxShadow: ["0 0 24px rgba(64,138,255,.18)", "0 0 38px rgba(139,92,246,.42)", "0 0 24px rgba(64,138,255,.18)"] }} transition={{ duration: 3.4, repeat: Infinity }}>
            <BrainCircuit size={22} />
          </motion.div>
          <div>
            <p className="brand-name">عقل أمير التطويري</p>
            <p className="brand-subtitle">مركز قيادة مجلس الذكاء الاصطناعي</p>
          </div>
        </div>

        <div className="topbar-status">
          <span className={`live-dot live-dot--${state}`} />
          <span>{STATUS_LABEL[state]}</span>
          <span className="topbar-divider" />
          <Cpu size={14} />
          <span>GenerationAdapter فعّال</span>
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
            <label className="field-label" htmlFor="project">المشروع</label>
            <div className="input-shell"><Database size={15} /><input id="project" value={project} onChange={(event) => setProject(event.target.value)} /></div>

            <label className="field-label" htmlFor="topic">موضوع النقاش</label>
            <div className="input-shell"><CircleDot size={15} /><input id="topic" value={topic} onChange={(event) => setTopic(event.target.value)} /></div>

            <div className="field-row"><label className="field-label" htmlFor="context">سياق المجلس</label><span className="field-hint">{context.length}/900</span></div>
            <textarea id="context" maxLength={900} value={context} onChange={(event) => setContext(event.target.value)} rows={7} />

            <label className="field-label key-label" htmlFor="access-key">مفتاح الوصول الخاص</label>
            <div className="input-shell key-shell"><KeyRound size={15} /><input id="access-key" type="password" autoComplete="off" placeholder="MCP_ACCESS_KEY" value={accessKey} onChange={(event) => setAccessKey(event.target.value)} /></div>
            <label className="remember-key"><input type="checkbox" checked={rememberKey} onChange={(event) => setRememberKey(event.target.checked)} /><span>حفظ المفتاح على هذا الجهاز فقط</span></label>

            <div className="round-control">
              <div><span className="field-label">جولات النقاش</span><p>تحليل مستقل، اعتراض، ثم تقارب نحو الخلاصة</p></div>
              <div className="stepper"><button type="button" onClick={() => setRounds((value) => Math.max(1, value - 1))}>−</button><strong>{rounds}</strong><button type="button" onClick={() => setRounds((value) => Math.min(3, value + 1))}>+</button></div>
            </div>

            <motion.button className="run-button" disabled={isRunning} type="button" whileHover={isRunning ? undefined : { y: -2 }} whileTap={isRunning ? undefined : { scale: .985 }} onClick={() => void startDebate()}>
              {isRunning ? <LoaderCircle className="spin" size={17} /> : <Play size={16} fill="currentColor" />}
              {isRunning ? "المجلس يحلل الآن..." : "بدء النقاش الحقيقي"}
              <span>{isRunning ? "يرجى الانتظار" : "API مباشر"}</span>
            </motion.button>
            {error ? <div className="engine-error">{error}</div> : null}
          </div>

          <div className="memory-strip">
            <div className="memory-strip__icon"><BrainCircuit size={16} /></div>
            <div><strong>سياق Open Brain متصل</strong><span>Namespaces · القرارات المعتمدة · سياسة التعارض</span></div>
            <span className="memory-count"><ShieldCheck size={13} /></span>
          </div>

          <div className="context-footer"><Radio size={14} />المحرك: <code>amir_council_debate</code></div>
        </aside>

        <section className="debate-pane">
          <div className="debate-toolbar">
            <div>
              <p className="eyebrow">النقاش الحي</p>
              <div className="thread-title-row"><h2>{topic || "مجلس جديد"}</h2><span className="round-pill">{rounds} جولة</span></div>
            </div>
            <div className="stream-health"><Activity size={15} /><span>{isRunning ? "جارٍ توليد المداولات" : `${streamEvents.length} حدث`}</span></div>
          </div>

          <div className="thread-scroll">
            <div className="thread-line" aria-hidden="true" />
            {!streamEvents.length && !isRunning ? <div className="empty-brain"><BrainCircuit size={34} /><strong>العقل جاهز للنقاش</strong><span>أدخل الموضوع والسياق ثم ابدأ النقاش الحقيقي.</span></div> : null}
            {isRunning ? <div className="thinking-brain"><motion.div animate={{ scale: [1, 1.12, 1], opacity: [.55, 1, .55] }} transition={{ repeat: Infinity, duration: 1.8 }}><BrainCircuit size={42} /></motion.div><strong>النماذج تتبادل النقد والمقترحات...</strong><span>سيظهر سجل الجولات فور اكتمال المجلس.</span></div> : null}
            <AnimatePresence initial={false}>
              {streamEvents.map((event, index) => event.type === "message" ? <ModelMessage key={event.message.id} message={event.message} index={index} /> : event.type === "conflict" ? <motion.div key={event.flag.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="conflict-event"><ConflictFlagBadge detail={event.flag.detail} /><span>{event.flag.timestamp}</span></motion.div> : null)}
            </AnimatePresence>
          </div>

          <div className="synthesis-wrap"><SynthesisPanel synthesis={latestSynthesis} /></div>

          <div className="composer-shell">
            <Sparkles size={16} />
            <input value={followUp} onChange={(event) => setFollowUp(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void submitFollowUp(); }} aria-label="متابعة النقاش" placeholder="أضف قيداً أو اطلب من المجلس تحدي نقطة محددة..." />
            <button type="button" aria-label="إرسال المتابعة" disabled={isRunning || !followUp.trim()} onClick={() => void submitFollowUp()}><Send size={16} /></button>
          </div>
        </section>
      </section>
    </main>
  );
}
