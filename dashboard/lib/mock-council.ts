import type { CouncilEvent } from "@/types/council";

export const MOCK_COUNCIL_EVENTS: CouncilEvent[] = [
  {
    type: "message",
    message: {
      id: "blue-1",
      modelLabel: "Architecture Model",
      tone: "blue",
      title: "Prefer one canonical Open Brain",
      content:
        "Keep a single memory substrate and isolate retrieval through logical namespaces. Hard-filter target_language and memory_scope before semantic ranking so learner context cannot leak across language boundaries by accident.",
      timestamp: "23:18",
      confidence: 94,
    },
  },
  {
    type: "message",
    message: {
      id: "red-1",
      modelLabel: "Adversarial Model",
      tone: "red",
      title: "Challenge: namespace drift",
      content:
        "A single store is operationally simpler, but only if every writer persists namespace metadata consistently. Legacy writers and null target_language rows need deterministic compatibility handling or retrieval quality degrades silently.",
      timestamp: "23:19",
      confidence: 89,
      conflict: {
        code: "CONFLICT_FLAG",
        detail: "Legacy memories may not contain a language namespace.",
      },
    },
  },
  {
    type: "conflict",
    flag: {
      id: "conflict-1",
      code: "CONFLICT_FLAG",
      detail: "Cross-language retrieval must be explicit opt-in, never an implicit fallback.",
      timestamp: "23:20",
    },
  },
  {
    type: "message",
    message: {
      id: "blue-2",
      modelLabel: "Architecture Model",
      tone: "blue",
      title: "Resolution path",
      content:
        "Use physical indexed namespace columns, a pre-filtered RPC, and a cross_language boolean that requires request-time opt-in. Preserve history while making the retrieval boundary deterministic and testable.",
      timestamp: "23:21",
      confidence: 97,
    },
  },
  {
    type: "synthesis",
    synthesis: {
      id: "synthesis-1",
      title: "Council Synthesis",
      summary:
        "Adopt a single Open Brain with strict logical namespace boundaries and deterministic pre-filtering before vector search.",
      recommendation:
        "Ship indexed target_language + memory_scope fields, explicit cross_language opt-in, compatibility backfill for legacy rows, and isolation tests in CI.",
      confidence: 96,
    },
  },
];
