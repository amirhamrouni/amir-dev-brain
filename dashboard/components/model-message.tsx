"use client";

import { motion } from "motion/react";
import { Bot, ShieldCheck } from "lucide-react";
import { ConflictFlagBadge } from "@/components/conflict-flag";
import type { CouncilMessage } from "@/types/council";

export function ModelMessage({ message, index }: { message: CouncilMessage; index: number }) {
  const isBlue = message.tone === "blue";

  return (
    <motion.article
      initial={{ opacity: 0, y: 18, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: Math.min(index * 0.045, 0.2), type: "spring", stiffness: 250, damping: 25 }}
      className={`model-message ${isBlue ? "model-message--blue" : "model-message--red"}`}
    >
      <motion.div
        className="neural-pulse"
        aria-hidden="true"
        animate={{ opacity: [.18, .65, .18], scale: [.94, 1.04, .94] }}
        transition={{ duration: 2.5 + (index % 3) * .35, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="model-message__rail" aria-hidden="true" />
      <div className="model-message__header">
        <motion.div className="model-avatar" animate={{ boxShadow: isBlue ? ["0 0 0 rgba(78,140,255,0)", "0 0 24px rgba(78,140,255,.35)", "0 0 0 rgba(78,140,255,0)"] : ["0 0 0 rgba(255,95,114,0)", "0 0 24px rgba(255,95,114,.3)", "0 0 0 rgba(255,95,114,0)"] }} transition={{ duration: 2.8, repeat: Infinity }}>
          <Bot size={17} strokeWidth={2.1} />
        </motion.div>
        <div>
          <p className="model-label">{message.modelLabel}</p>
          <p className="model-title">{message.title}</p>
        </div>
        <span className="message-time">{message.timestamp}</span>
      </div>

      <p className="model-content">{message.content}</p>

      <div className="model-message__footer">
        {typeof message.confidence === "number" ? (
          <span className="confidence-pill"><ShieldCheck size={13} /> ثقة {message.confidence}%</span>
        ) : <span className="confidence-pill"><ShieldCheck size={13} /> رأي نموذج</span>}
        {message.conflict ? <ConflictFlagBadge detail={message.conflict.detail} compact /> : null}
      </div>
    </motion.article>
  );
}
