// ---------------------------------------------------------------------------
// Brief — raw user inputs from the form
// ---------------------------------------------------------------------------

export type AdBrief = {
  product: string;
  audience: string;
  platform: string;
  tone: string;
};

// ---------------------------------------------------------------------------
// Plan — structured strategy produced before generation
// ---------------------------------------------------------------------------

export type AdPlan = {
  tone: "Persuasive" | "Professional" | "Casual" | "Urgent";
  targetAudience: string;
  keyAngles: string[];
  ctaStyle: "soft" | "aggressive";
};

// ---------------------------------------------------------------------------
// Ad output — what the generation step produces
// ---------------------------------------------------------------------------

export type AdOutput = {
  headline: string;
  body: string;
  cta: string;
  tone: string;
};

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type ValidationIssue = {
  field: keyof AdOutput;
  message: string;
};

export type ValidationResult = {
  valid: boolean;
  issues: ValidationIssue[];
};

// ---------------------------------------------------------------------------
// Pipeline steps
// ---------------------------------------------------------------------------

export type PipelineStepName = "plan" | "generate" | "validate" | "regenerate";

export type PipelineStep = {
  name: PipelineStepName;
  status: "success" | "failure";
  durationMs: number;
  detail?: string;
};

// ---------------------------------------------------------------------------
// Pipeline result — returned to the API caller
// ---------------------------------------------------------------------------

export type PipelineResult = {
  success: boolean;
  ad: AdOutput | null;
  plan: AdPlan | null;
  score: number;
  confidenceScore: number;
  attempts: number;
  steps: PipelineStep[];
  error?: string;
};

// ---------------------------------------------------------------------------
// SSE streaming events — emitted progressively to the client
// ---------------------------------------------------------------------------

export type PipelineStage =
  | "planning"
  | "generating"
  | "validating"
  | "retrying"
  | "complete"
  | "error";

export type StreamEvent =
  | { type: "stage"; stage: PipelineStage; attempt?: number }
  | { type: "plan"; plan: AdPlan }
  | { type: "result"; result: PipelineResult }
  | { type: "error"; message: string };
