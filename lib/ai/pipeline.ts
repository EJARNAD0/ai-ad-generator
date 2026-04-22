import type {
  AdBrief,
  AdOutput,
  AdPlan,
  PipelineResult,
  PipelineStep,
  PipelineStepName,
  StreamEvent,
} from "@/types/ai";
import { LLM_TIMEOUT_MS, MODEL, OPENROUTER_URL } from "./config";
import { logger } from "./logger";
import { planAdStructure } from "./planner";
import { buildCorrectivePrompt, buildUserPrompt, SYSTEM_PROMPT } from "./prompts";
import { computeConfidenceScore, parseAdOutput, scoreAd, validateAd } from "./validator";

const MAX_ATTEMPTS = 2;

// ---------------------------------------------------------------------------
// Step builder
// ---------------------------------------------------------------------------

const makeStep = (
  name: PipelineStepName,
  status: "success" | "failure",
  durationMs: number,
  detail?: string,
): PipelineStep => ({ name, status, durationMs, detail });

// ---------------------------------------------------------------------------
// LLM call (ad generation only — planner has its own fetch in planner.ts)
// ---------------------------------------------------------------------------

const callLLM = async (userPrompt: string, apiKey: string): Promise<string> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);

  try {
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as Record<string, unknown>;
      const msg = (body?.error as Record<string, unknown>)?.message ?? `HTTP ${res.status}`;
      throw new Error(String(msg));
    }

    const data = await res.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    return data.choices?.[0]?.message?.content ?? "";
  } finally {
    clearTimeout(timeout);
  }
};

// ---------------------------------------------------------------------------
// Pipeline  — Plan → Generate → Validate → Retry (if needed)
// ---------------------------------------------------------------------------

export const generateAdPipeline = async (
  brief: AdBrief,
  apiKey: string,
  onEvent?: (event: StreamEvent) => void,
): Promise<PipelineResult> => {
  const steps: PipelineStep[] = [];
  let lastAd: AdOutput | null = null;
  let plan: AdPlan | null = null;
  let passedValidation = false;

  logger.info("pipeline", { stage: "start", product: brief.product, platform: brief.platform });

  // -------------------------------------------------------------------------
  // Step 1: Plan
  // -------------------------------------------------------------------------

  onEvent?.({ type: "stage", stage: "planning" });
  const planStart = Date.now();

  plan = await planAdStructure(brief, apiKey);
  const planDuration = Date.now() - planStart;

  if (plan) {
    steps.push(makeStep("plan", "success", planDuration));
    logger.info("plan", { durationMs: planDuration, tone: plan.tone, ctaStyle: plan.ctaStyle });
    onEvent?.({ type: "plan", plan });
  } else {
    // Planning failure is non-fatal — generation proceeds without a plan
    steps.push(makeStep("plan", "failure", planDuration, "Plan parse failed — continuing without plan"));
    logger.warn("plan", { durationMs: planDuration, reason: "Proceeding without plan" });
  }

  // -------------------------------------------------------------------------
  // Step 2+: Generate → Validate → Retry loop
  // -------------------------------------------------------------------------

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const isRetry = attempt > 1;
    const genStepName: PipelineStepName = isRetry ? "regenerate" : "generate";
    const stage = isRetry ? "retrying" : "generating";

    onEvent?.({ type: "stage", stage, attempt });

    logger.info(genStepName, { attempt, maxAttempts: MAX_ATTEMPTS, isRetry });

    // --- LLM call ---
    const genStart = Date.now();
    let rawOutput: string;

    try {
      const prompt = isRetry
        ? buildCorrectivePrompt(
            brief,
            lastAd
              ? validateAd(lastAd).issues.map((i) => i.message)
              : ["Previous response could not be parsed as valid JSON"],
            plan ?? undefined,
          )
        : buildUserPrompt(brief, plan ?? undefined);

      rawOutput = await callLLM(prompt, apiKey);
      steps.push(makeStep(genStepName, "success", Date.now() - genStart));
      logger.info(genStepName, { attempt, chars: rawOutput.length, durationMs: Date.now() - genStart });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown LLM error";
      steps.push(makeStep(genStepName, "failure", Date.now() - genStart, message));
      logger.error(genStepName, { attempt, error: message });

      if (attempt === MAX_ATTEMPTS) {
        onEvent?.({ type: "error", message: `API error: ${message}` });
        return { success: false, ad: null, plan, score: 0, confidenceScore: 0, attempts: attempt, steps, error: `API error: ${message}` };
      }
      continue;
    }

    // --- Parse ---
    onEvent?.({ type: "stage", stage: "validating" });
    const valStart = Date.now();
    const parsed = parseAdOutput(rawOutput);

    if (!parsed) {
      const detail = "Could not parse JSON from response";
      steps.push(makeStep("validate", "failure", Date.now() - valStart, detail));
      logger.warn("validate", { attempt, reason: detail, preview: rawOutput.slice(0, 300) });

      if (attempt === MAX_ATTEMPTS) {
        const errMsg = "AI returned an unparseable response. Please try again.";
        onEvent?.({ type: "error", message: errMsg });
        return { success: false, ad: null, plan, score: 0, confidenceScore: 0, attempts: attempt, steps, error: errMsg };
      }
      continue;
    }

    lastAd = parsed;

    // --- Validate ---
    const validation = validateAd(parsed);

    if (!validation.valid) {
      const detail = validation.issues.map((i) => i.message).join("; ");
      steps.push(makeStep("validate", "failure", Date.now() - valStart, detail));
      logger.warn("validate", { attempt, issues: validation.issues });

      if (attempt === MAX_ATTEMPTS) {
        // Accept partial result on final attempt rather than leaving the user empty-handed
        const score = scoreAd(parsed);
        const confidenceScore = computeConfidenceScore(score, attempt, false);
        steps.push(makeStep("validate", "success", 0, "Accepted with warnings on final attempt"));
        logger.info("validate", { attempt, result: "accepted-with-warnings", score, confidenceScore });

        const result: PipelineResult = { success: true, ad: parsed, plan, score, confidenceScore, attempts: attempt, steps };
        onEvent?.({ type: "result", result });
        return result;
      }
      continue;
    }

    // --- Pass ---
    passedValidation = true;
    steps.push(makeStep("validate", "success", Date.now() - valStart));
    logger.info("validate", { attempt, result: "passed" });

    const score = scoreAd(parsed);
    const confidenceScore = computeConfidenceScore(score, attempt, passedValidation);
    logger.info("pipeline", { stage: "complete", score, confidenceScore, attempts: attempt });

    const result: PipelineResult = { success: true, ad: parsed, plan, score, confidenceScore, attempts: attempt, steps };
    onEvent?.({ type: "result", result });
    return result;
  }

  return { success: false, ad: null, plan, score: 0, confidenceScore: 0, attempts: MAX_ATTEMPTS, steps, error: "Max attempts reached." };
};
