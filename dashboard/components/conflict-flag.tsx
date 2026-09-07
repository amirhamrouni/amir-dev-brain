"use client";

import { motion } from "motion/react";
import { TriangleAlert } from "lucide-react";

export function ConflictFlagBadge({ detail, compact = false }: { detail?: string; compact?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 360, damping: 28 }}
      className={compact ? "conflict-badge conflict-badge--compact" : "conflict-badge"}
      title={detail}
    >
      <TriangleAlert size={14} strokeWidth={2.2} aria-hidden="true" />
      <span>[CONFLICT_FLAG]</span>
      {detail && !compact ? <span className="conflict-detail">{detail}</span> : null}
    </motion.div>
  );
}
