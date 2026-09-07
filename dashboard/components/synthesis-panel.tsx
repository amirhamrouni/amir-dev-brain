"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Check, Sparkles, X } from "lucide-react";
import type { CouncilSynthesis } from "@/types/council";

type Decision = "approved" | "rejected" | null;

export function SynthesisPanel({ synthesis }: { synthesis: CouncilSynthesis | null }) {
  const [decision, setDecision] = useState<Decision>(null);

  if (!synthesis) {
    return (
      <div className="synthesis-panel synthesis-panel--empty">
        <Sparkles size={18} />
        <span>ستظهر خلاصة المجلس هنا بعد اكتمال النقاش الحقيقي.</span>
      </div>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 220, damping: 24 }}
      className="synthesis-panel"
    >
      <div className="synthesis-head">
        <motion.div className="synthesis-icon" animate={{ rotate: [0, 4, -4, 0], scale: [1, 1.08, 1] }} transition={{ duration: 4, repeat: Infinity }}><Sparkles size={17} /></motion.div>
        <div>
          <p className="eyebrow">الخلاصة النهائية</p>
          <h2>{synthesis.title}</h2>
        </div>
        <span className="synthesis-confidence">{synthesis.confidence}%</span>
      </div>

      <p className="synthesis-summary">{synthesis.summary}</p>
      <div className="recommendation-box">
        <span>توصية المجلس</span>
        <p>{synthesis.recommendation}</p>
      </div>

      <div className="decision-row">
        <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }} onClick={() => setDecision("approved")} className={`decision-button decision-button--approve ${decision === "approved" ? "is-selected" : ""}`} type="button">
          <Check size={16} /> موافقة
        </motion.button>
        <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }} onClick={() => setDecision("rejected")} className={`decision-button decision-button--reject ${decision === "rejected" ? "is-selected" : ""}`} type="button">
          <X size={16} /> رفض
        </motion.button>
        <span className={`decision-state ${decision ? `decision-state--${decision}` : ""}`}>
          {decision === "approved" ? "معلّمة للموافقة" : decision === "rejected" ? "معلّمة للمراجعة" : "بانتظار قرار أمير"}
        </span>
      </div>
    </motion.section>
  );
}
