import type { AdBrief, AdPlan } from "@/types/ai";
import { LLM_TIMEOUT_MS, MODEL, OPENROUTER_URL } from "./config";
import { logger } from "./logger";

const VALID_TONES = new Set(["Persuasive", "Professional", "Casual", "Urgent"]);
const VALID_CTA_STYLES = new Set(["soft", "aggressive"]);

// ---------------------------------------------------------------------------
// Planner system prompt — separate concern from the ad writer
// ---------------------------------------------------------------------------

const PLANNER_SYSTEM_PROMPT = `
You are an advertising strategy expert. Your job is to analyze a product brief and produce a structured ad strategy plan.

You MUST return a single valid JSON object with EXACTLY these four fields and no others:
{
  "tone":           "<one of: Persuasive | Professional | Casual | Urgent>",
  "targetAudience": "<one sentence describing who this ad targets>",
  "keyAngles":      ["<angle 1>", "<angle 2>", "<angle 3>"],
  "ctaStyle":       "<one of: soft | aggressive>"
}

Rules:
- Return ONLY the JSON object. No markdown, no code fences, no explanation.
- keyAngles: provide exactly 3 distinct messaging angles to test.
- Derive tone from the brief's requested tone field, but override if the platform demands it.
- ctaStyle soft = inviting (Get Started, Learn More). aggressive = urgent (Buy Now, Claim Offer).
`.trim();

const buildPlanPrompt = (brief: AdBrief): string =>
  [
    `Product: ${brief.product}`,
    `Target Audience: ${brief.audience}`,
    `Platform: ${brief.platform}`,
    `Requested Tone: ${brief.tone}`,
    "",
    "Analyze this brief and return a structured ad strategy plan as JSON.",
  ].join("\n");

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

const parseAdPlan = (raw: string): AdPlan | null => {
  try {
    const cleaned = raw
      .replace(/^```(?:json)?/im, "")
      .replace(/```$/im, "")
      .trim();

    const parsed: unknown = JSON.parse(cleaned);

    if (
      parsed === null ||
      typeof parsed !== "object" ||
      !("tone" in parsed) ||
      !("targetAudience" in parsed) ||
      !("keyAngles" in parsed) ||
      !("ctaStyle" in parsed)
    ) {
      return null;
    }

    const p = parsed as Record<string, unknown>;

    const keyAngles = Array.isArray(p.keyAngles)
      ? (p.keyAngles as unknown[]).map(String).filter(Boolean).slice(0, 3)
      : [];

    const tone = String(p.tone).trim();
    const ctaStyle = String(p.ctaStyle).trim();

    return {
      tone: (VALID_TONES.has(tone) ? tone : "Persuasive") as AdPlan["tone"],
      targetAudience: String(p.targetAudience).trim(),
      keyAngles,
      ctaStyle: (VALID_CTA_STYLES.has(ctaStyle) ? ctaStyle : "soft") as AdPlan["ctaStyle"],
    };
  } catch {
    return null;
  }
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const planAdStructure = async (
  brief: AdBrief,
  apiKey: string,
): Promise<AdPlan | null> => {
  logger.info("plan", { product: brief.product, platform: brief.platform, tone: brief.tone });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);

  let raw: string;
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
          { role: "system", content: PLANNER_SYSTEM_PROMPT },
          { role: "user", content: buildPlanPrompt(brief) },
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as Record<string, unknown>;
      const msg = (body?.error as Record<string, unknown>)?.message ?? `HTTP ${res.status}`;
      logger.error("plan", { error: String(msg) });
      return null;
    }

    const data = await res.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    raw = data.choices?.[0]?.message?.content ?? "";
  } catch (err) {
    logger.error("plan", { error: err instanceof Error ? err.message : String(err) });
    return null;
  } finally {
    clearTimeout(timeout);
  }
  const plan = parseAdPlan(raw);

  if (plan) {
    logger.info("plan", { result: plan });
  } else {
    logger.warn("plan", { reason: "JSON parse failed", preview: raw.slice(0, 200) });
  }

  return plan;
};
