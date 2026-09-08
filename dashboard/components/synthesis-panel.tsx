"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Check, Database, LoaderCircle, Sparkles, X } from "lucide-react";
import type { ApprovalReceipt } from "@/hooks/use-council-lite";
import type { CouncilSynthesis } from "@/types/council";

type Decision = "approved" | "rejected" | null;

export function SynthesisPanel({
  synthesis,
  onApprove,
}: {
  synthesis: CouncilSynthesis | null;
  onApprove?: () => Promise<ApprovalReceipt>;
}) {
  const [decision, setDecision] = useState<Decision>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ApprovalReceipt | null>(null);

  useEffect(() => {
    setDecision(null);
    setSaving(false);
    setSaveError(null);
    setReceipt(null);
  }, [synthesis?.recommendation]);

  if (!synthesis) {
    return (
      <div className="synthesis-panel synthesis-panel--empty">
        <Sparkles size={18} />
        <span>ستظهر خلاصة المجلس هنا بعد اكتمال النقاش الحقيقي.</span>
      </div>
    );
  }

  async function approve() {
    if (!onApprove || saving || receipt) return;
    setSaveError(null);
    setSaving(true);

    try {
      const saved = await onApprove();
      setReceipt(saved);
      setDecision("approved");
    } catch (error) {
      setDecision(null);
      setSaveError(
        error instanceof Error ? error.message : "تعذر حفظ القرار في الذاكرة الدائمة.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 220, damping: 24 }}
      className="synthesis-panel"
    >
      <div className="synthesis-head">
        <motion.div
          className="synthesis-icon"
          animate={{ rotate: [0, 4, -4, 0], scale: [1, 1.08, 1] }}
          transition={{ duration: 4, repeat: Infinity }}
        >
          <Sparkles size={17} />
        </motion.div>
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
        <motion.button
          whileHover={saving || receipt ? undefined : { y: -1 }}
          whileTap={saving || receipt ? undefined : { scale: 0.98 }}
          disabled={saving || Boolean(receipt)}
          onClick={() => void approve()}
          className={`decision-button decision-button--approve ${decision === "approved" ? "is-selected" : ""}`}
          type="button"
        >
          {saving ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />}
          اعتماد النتيجة
        </motion.button>
        <motion.button
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.98 }}
          disabled={saving || Boolean(receipt)}
          onClick={() => setDecision("rejected")}
          className={`decision-button decision-button--reject ${decision === "rejected" ? "is-selected" : ""}`}
          type="button"
        >
          <X size={16} /> رفض
        </motion.button>
        <span className={`decision-state ${decision ? `decision-state--${decision}` : ""}`}>
          {decision === "approved"
            ? "تم اعتماد النتيجة وحفظها"
            : decision === "rejected"
              ? "معلّمة للمراجعة"
              : saving
                ? "جارٍ الحفظ..."
                : "بانتظار قرار أمير"}
        </span>
      </div>

      {receipt ? (
        <div className="memory-strip">
          <div className="memory-strip__icon">
            <Database size={16} />
          </div>
          <div>
            <strong>تم حفظ القرار في الذاكرة الدائمة</strong>
            <span>
              المعرّف: <code dir="ltr">{receipt.decisionId}</code> · vector_status: {" "}
              <code dir="ltr">{receipt.vectorStatus}</code>
            </span>
          </div>
          <Check size={13} />
        </div>
      ) : null}

      {receipt?.vectorStatus === "FAILED" ? (
        <div className="engine-error">
          تم حفظ القرار في PostgreSQL، لكن فهرسة Qdrant فشلت وستحتاج إعادة فهرسة.
        </div>
      ) : null}
      {saveError ? <div className="engine-error">{saveError}</div> : null}
    </motion.section>
  );
}
