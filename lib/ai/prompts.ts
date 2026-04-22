import type { AdBrief, AdPlan } from "@/types/ai";

// ---------------------------------------------------------------------------
// Ad writer system prompt
// ---------------------------------------------------------------------------

export const SYSTEM_PROMPT = `
You are an expert advertising copywriter specializing in platform-native ad creative.
Your sole job is to generate high-converting ad copy from a brief and return it as JSON.

You MUST return a single valid JSON object with EXACTLY these four fields and no others:
{
  "headline": "<benefit-led headline, max 80 characters>",
  "body":     "<persuasive body copy, 1-3 sentences, platform-native>",
  "cta":      "<action-oriented call-to-action, max 30 characters, starts with a verb>",
  "tone":     "<one of: Persuasive | Professional | Casual | Urgent>"
}

Strict constraints:
- Output ONLY the JSON object. No markdown. No code fences. No preamble. No explanation.
- Do NOT add extra fields. Do NOT nest the JSON. Do NOT wrap in an array.
- If you cannot comply perfectly, output the JSON anyway with your best attempt at the correct format.
- headline: max 80 characters. Lead with a clear benefit or hook.
- body: 1-3 sentences. Concise. Speaks directly to the audience's pain point or desire.
- cta: max 30 characters. Action verb first (e.g. "Start Free", "Get the Guide", "Claim Your Spot").
- tone: must be exactly one of the four allowed values — Persuasive, Professional, Casual, Urgent.
`.trim();

// ---------------------------------------------------------------------------
// User prompt — optionally enriched with plan data
// ---------------------------------------------------------------------------

export const buildUserPrompt = (brief: AdBrief, plan?: AdPlan): string => {
  const lines: string[] = [
    `Product: ${brief.product}`,
    `Target Audience: ${brief.audience}`,
    `Platform: ${brief.platform}`,
    `Tone: ${brief.tone}`,
  ];

  if (plan) {
    lines.push(
      "",
      "Strategic context (use this to strengthen the copy):",
      `  Audience insight: ${plan.targetAudience}`,
      `  Key angles to weave in: ${plan.keyAngles.join(" | ")}`,
      `  CTA style: ${plan.ctaStyle} (${plan.ctaStyle === "soft" ? "inviting, low-pressure" : "urgent, high-pressure"})`,
    );
  }

  lines.push(
    "",
    "Generate ad copy that feels native to the platform and speaks directly to the audience.",
    "Return only valid JSON.",
  );

  return lines.join("\n");
};

// ---------------------------------------------------------------------------
// Corrective prompt — used on retry, lists exact issues to fix
// ---------------------------------------------------------------------------

export const buildCorrectivePrompt = (
  brief: AdBrief,
  issues: string[],
  plan?: AdPlan,
): string =>
  [
    buildUserPrompt(brief, plan),
    "",
    "CRITICAL — your previous response had these problems. You MUST fix all of them:",
    ...issues.map((issue) => `  - ${issue}`),
    "",
    "Fix every issue. Return ONLY valid JSON matching the exact schema. Nothing else.",
  ].join("\n");
