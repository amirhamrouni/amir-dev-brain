"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Activity,
  BrainCircuit,
  CircleDot,
  Command,
  Database,
  Play,
  Radio,
  Send,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { ConflictFlagBadge } from "@/components/conflict-flag";
import { ModelMessage } from "@/components/model-message";
import { SynthesisPanel } from "@/components/synthesis-panel";
import { useCouncilRealtime } from "@/hooks/use-council-realtime";
import { MOCK_COUNCIL_EVENTS } from "@/lib/mock-council";
import type { CouncilEvent } from "@/types/council";

const STATUS_LABEL = {
  mock: "Mock stream",
  connecting: "Connecting",
  connected: "Realtime live",
  error: "Realtime degraded",
} as const;

export function CouncilDashboard() {
  const [project, setProject] = useState("amir-dev-brain");
  const [topic, setTopic] = useState("architecture-and-memory-separation");
  const [context, setContext] = useState(
    "Review the current architecture, challenge assumptions, surface conflicts, and produce an implementation-ready synthesis with explicit trade-offs.",
  );
  const [rounds, setRounds] = useState(3);
  const [mockRound, setMockRound] = useState(1);
  const { events, latestSynthesis, state, injectMockEvent } = useCouncilRealtime(MOCK_COUNCIL_EVENTS);

  const streamEvents = useMemo(() => events.filter((event) => event.type !== "synthesis"), [events]);

  function runMockRound() {
    const isBlue = mockRound % 2 === 1;
    const event: CouncilEvent = {
      type: "message",
      message: {
        id: `mock-${Date.now()}`,
        modelLabel: isBlue ? "Architecture Model" : "Adversarial Model",
        tone: isBlue ? "blue" : "red",
        title: isBlue ? `Round ${mockRound}: implementation path` : `Round ${mockRound}: adversarial review`,
        content: isBlue
          ? "Keep the change set explicit, typed, observable and reversible. Prefer deterministic boundaries before adding model complexity."
          : "Stress-test failure modes, stale context, authorization boundaries and rollback behavior before treating the proposal as production safe.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        confidence: isBlue ? 95 : 90,
      },
    };
    injectMockEvent(event);
    setMockRound((current) => current + 1);
  }

  return (
    <main className="brain-shell">
      <div className="ambient ambient--one" />
      <div className="ambient ambient--two" />

      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark"><BrainCircuit size={20} /></div>
          <div>
            <p className="brand-name">Amir Dev Brain</p>
            <p className="brand-subtitle">Council Command Center</p>
          </div>
        </div>

        <div className="topbar-status">
          <span className={`live-dot live-dot--${state}`} />
          <span>{STATUS_LABEL[state]}</span>
          <span className="topbar-divider" />
          <Command size={14} />
          <span>Premium console</span>
        </div>
      </header>

      <section className="workspace-grid">
        <aside className="context-pane">
          <div className="pane-heading">
            <div>
              <p className="eyebrow">Input & context</p>
              <h1>Open a governed debate</h1>
            </div>
            <div className="context-icon"><SlidersHorizontal size={18} /></div>
          </div>

          <div className="context-card">
            <label className="field-label" htmlFor="project">Project</label>
            <div className="input-shell">
              <Database size={15} />
              <input id="project" value={project} onChange={(event) => setProject(event.target.value)} />
            </div>

            <label className="field-label" htmlFor="topic">Topic</label>
            <div className="input-shell">
              <CircleDot size={15} />
              <input id="topic" value={topic} onChange={(event) => setTopic(event.target.value)} />
            </div>

            <div className="field-row">
              <label className="field-label" htmlFor="context">Council context</label>
              <span className="field-hint">{context.length}/900</span>
            </div>
            <textarea
              id="context"
              maxLength={900}
              value={context}
              onChange={(event) => setContext(event.target.value)}
              rows={8}
            />

            <div className="round-control">
              <div>
                <span className="field-label">Debate rounds</span>
                <p>Independent challenge + synthesis loop</p>
              </div>
              <div className="stepper">
                <button type="button" onClick={() => setRounds((value) => Math.max(1, value - 1))}>−</button>
                <strong>{rounds}</strong>
                <button type="button" onClick={() => setRounds((value) => Math.min(5, value + 1))}>+</button>
              </div>
            </div>

            <motion.button className="run-button" type="button" whileHover={{ y: -1 }} whileTap={{ scale: 0.99 }} onClick={runMockRound}>
              <Play size={16} fill="currentColor" />
              Run mock round
              <span>Realtime-ready</span>
            </motion.button>
          </div>

          <div className="memory-strip">
            <div className="memory-strip__icon"><BrainCircuit size={16} /></div>
            <div>
              <strong>Open Brain context attached</strong>
              <span>Namespace filters · approved decisions · conflict policy</span>
            </div>
            <span className="memory-count">8</span>
          </div>

          <div className="context-footer">
            <Radio size={14} />
            Broadcast channel: <code>{process.env.NEXT_PUBLIC_COUNCIL_CHANNEL || "amir-dev-brain:council"}</code>
          </div>
        </aside>

        <section className="debate-pane">
          <div className="debate-toolbar">
            <div>
              <p className="eyebrow">Live debate thread</p>
              <div className="thread-title-row">
                <h2>{topic || "Untitled council"}</h2>
                <span className="round-pill">{rounds} rounds</span>
              </div>
            </div>
            <div className="stream-health">
              <Activity size={15} />
              <span>{streamEvents.length} events</span>
            </div>
          </div>

          <div className="thread-scroll">
            <div className="thread-line" aria-hidden="true" />
            <AnimatePresence initial={false}>
              {streamEvents.map((event, index) => {
                if (event.type === "message") {
                  return <ModelMessage key={event.message.id} message={event.message} index={index} />;
                }
                if (event.type === "conflict") {
                  return (
                    <motion.div key={event.flag.id} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} className="conflict-event">
                      <ConflictFlagBadge detail={event.flag.detail} />
                      <span>{event.flag.timestamp}</span>
                    </motion.div>
                  );
                }
                return null;
              })}
            </AnimatePresence>
          </div>

          <div className="synthesis-wrap">
            <SynthesisPanel synthesis={latestSynthesis} />
          </div>

          <div className="composer-shell">
            <Sparkles size={16} />
            <input aria-label="Council follow-up" placeholder="Add a constraint or ask the models to challenge a decision…" />
            <button type="button" aria-label="Send follow-up"><Send size={16} /></button>
          </div>
        </section>
      </section>
    </main>
  );
}
