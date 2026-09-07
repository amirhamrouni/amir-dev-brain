"use client";

import { motion } from "motion/react";
import { Bot, ShieldCheck } from "lucide-react";
import { ConflictFlagBadge } from "@/components/conflict-flag";
import type { CouncilMessage } from "@/types/council";

export function ModelMessage({ message, index }: { message: CouncilMessage; index: number }) {
  const isBlue = message.tone === "blue";

  return (
    <motion.article
      initial={{ opacity: 0, y: 16, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: Math.min(index * 0.045, 0.2), type: "spring", stiffness: 260, damping: 26 }}
      className={`model-message ${isBlue ? "model-message--blue" : "model-message--red"}`}
    >
      <div className="model-message__rail" aria-hidden="true" />
      <div className="model-message__header">
        <div className="model-avatar">
          <Bot size={17} strokeWidth={2.1} />
        </div>
        <div>
          <p className="model-label">{message.modelLabel}</p>
          <p className="model-title">{message.title}</p>
        </div>
        <span className="message-time">{message.timestamp}</span>
      </div>

      <p className="model-content">{message.content}</p>

      <div className="model-message__footer">
        {typeof message.confidence === "number" ? (
          <span className="confidence-pill">
            <ShieldCheck size={13} /> {message.confidence}% confidence
          </span>
        ) : <span />}
        {message.conflict ? <ConflictFlagBadge detail={message.conflict.detail} compact /> : null}
      </div>
    </motion.article>
  );
}
