export type ModelTone = "blue" | "red";

export type CouncilMessage = {
  id: string;
  modelLabel: string;
  tone: ModelTone;
  title: string;
  content: string;
  timestamp: string;
  confidence?: number;
  conflict?: {
    code: string;
    detail: string;
  };
};

export type ConflictFlag = {
  id: string;
  code: string;
  detail: string;
  timestamp: string;
};

export type CouncilSynthesis = {
  id: string;
  title: string;
  summary: string;
  recommendation: string;
  confidence: number;
};

export type CouncilEvent =
  | { type: "message"; message: CouncilMessage }
  | { type: "conflict"; flag: ConflictFlag }
  | { type: "synthesis"; synthesis: CouncilSynthesis };
