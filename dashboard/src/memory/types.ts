export type DecisionState =
  | "ACTIVE"
  | "REVIEW_DUE"
  | "EVIDENCE_STALE"
  | "REVALIDATING"
  | "SUPERSEDED"
  | "REVOKED";

export type EvidenceStatus =
  | "VALID"
  | "POTENTIALLY_STALE"
  | "STALE"
  | "REVALIDATING";

export type EvidenceCriticality = "CRITICAL" | "SUPPORTING" | "CONTEXTUAL";

export type EvidenceRelation = "SUPPORTS" | "CONTRADICTS" | "REVALIDATES";

export type VersionBindingKind =
  | "DEPENDENCY"
  | "TOOL"
  | "MODEL"
  | "POLICY"
  | "RUNTIME";

export type VersionBindingMode =
  | "REQUIRED"
  | "EVIDENCE_VALIDATION"
  | "INFORMATIONAL";

export type RevalidationTrigger =
  | "dependency_change"
  | "security_finding"
  | "policy_change"
  | "tool_major_change"
  | "tool_minor_change"
  | "environment_change"
  | "evidence_invalidated"
  | "implementation_change"
  | "manual_review"
  | "time_review_due";

export type VectorStatus = "PENDING" | "INDEXED" | "FAILED";

export type BrainArtifactType =
  | "EVIDENCE"
  | "FACT"
  | "FINDING"
  | "OPINION"
  | "PROPOSAL"
  | "DECISION";

export interface VersionBinding {
  component: string;
  kind: VersionBindingKind;
  observedVersion: string;
  bindingMode: VersionBindingMode;
}

export interface ReviewPolicy {
  reviewAfter?: string | null;
  maxAgeDays: number;
  triggers: RevalidationTrigger[];
}

export interface EvidenceLink {
  evidenceId: string;
  relation: EvidenceRelation;
  criticality: EvidenceCriticality;
  status: EvidenceStatus;
}

export interface Decision {
  id: string;
  project: string;
  title: string;
  question?: string | null;
  synthesis: string;
  state: DecisionState;
  approvedBy: string;
  approvedAt: string;
  createdAt: string;
  updatedAt: string;
  councilVersion?: string | null;
  modelContext: string[];
  versionBindings: VersionBinding[];
  evidenceLinks: EvidenceLink[];
  reviewPolicy: ReviewPolicy;
  supersedes?: string | null;
  vectorStatus: VectorStatus;
}

export interface Evidence {
  id: string;
  project: string;
  artifactType: Extract<BrainArtifactType, "EVIDENCE">;
  evidenceType: string;
  title: string;
  content?: string | null;
  locator?: string | null;
  contentHash?: string | null;
  status: EvidenceStatus;
  capturedAt: string;
  metadata: Record<string, unknown>;
}

export interface DecisionEvidenceRecord {
  decisionId: string;
  evidenceId: string;
  relation: EvidenceRelation;
  criticality: EvidenceCriticality;
}

export interface DecisionSearchOptions {
  project?: string;
  limit?: number;
  states?: DecisionState[];
}

export interface DecisionVectorPayload {
  decisionId: string;
  project: string;
  title: string;
  state: DecisionState;
  approvedAt: string;
  councilVersion?: string | null;
}

export interface MemoryAPI {
  saveDecision(decision: Decision): Promise<Decision>;
  getDecision(id: string): Promise<Decision | null>;
  searchDecisions(query: string, options?: DecisionSearchOptions): Promise<Decision[]>;
  updateDecisionState(id: string, state: DecisionState): Promise<void>;
  attachEvidence(decisionId: string, evidence: EvidenceLink): Promise<void>;
  reindexDecision(id: string): Promise<void>;
}
