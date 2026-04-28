import type { AdOutput, ValidationIssue, ValidationResult } from "@/types/ai";

const HEADLINE_MAX = 80;
const CTA_MAX = 30;
const VALID_TONES = new Set(["Persuasive", "Professional", "Casual", "Urgent"]);

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

export const parseAdOutput = (raw: string): AdOutput | null => {
  try {
    // Strip all markdown code fences
    let cleaned = raw.replace(/```(?:json)?\s*/g, "").trim();

    // Extract just the JSON object, ignoring any preamble or postamble text
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end > start) {
      cleaned = cleaned.slice(start, end + 1);
    }

    const parsed: unknown = JSON.parse(cleaned);

    if (
      parsed === null ||
      typeof parsed !== "object" ||
      !("headline" in parsed) ||
      !("body" in parsed) ||
      !("cta" in parsed) ||
      !("tone" in parsed) ||
      typeof (parsed as Record<string, unknown>).headline !== "string" ||
      typeof (parsed as Record<string, unknown>).body !== "string" ||
      typeof (parsed as Record<string, unknown>).cta !== "string" ||
      typeof (parsed as Record<string, unknown>).tone !== "string"
    ) {
      return null;
    }

    const p = parsed as Record<string, string>;
    return {
      headline: p.headline.trim(),
      body: p.body.trim(),
      cta: p.cta.trim(),
      tone: p.tone.trim(),
    };
  } catch {
    return null;
  }
};

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export const validateAd = (ad: AdOutput): ValidationResult => {
  const issues: ValidationIssue[] = [];

  if (!ad.headline.trim()) {
    issues.push({ field: "headline", message: "Headline is missing or empty" });
  } else if (ad.headline.length > HEADLINE_MAX) {
    issues.push({
      field: "headline",
      message: `Headline is ${ad.headline.length} chars — must be ${HEADLINE_MAX} or fewer`,
    });
  }

  if (!ad.body.trim()) {
    issues.push({ field: "body", message: "Body copy is missing or empty" });
  }

  if (!ad.cta.trim()) {
    issues.push({ field: "cta", message: "CTA is missing or empty" });
  } else if (ad.cta.length > CTA_MAX) {
    issues.push({
      field: "cta",
      message: `CTA is ${ad.cta.length} chars — must be ${CTA_MAX} or fewer`,
    });
  }

  if (!VALID_TONES.has(ad.tone)) {
    issues.push({
      field: "tone",
      message: `Tone "${ad.tone}" is not one of: ${[...VALID_TONES].join(", ")}`,
    });
  }

  return { valid: issues.length === 0, issues };
};

// ---------------------------------------------------------------------------
// Quality scoring (0–100) — measures output richness
// ---------------------------------------------------------------------------

export const scoreAd = (ad: AdOutput): number => {
  let score = 55;

  const hl = ad.headline.length;
  if (hl >= 20 && hl <= 60) score += 15;
  else if (hl > 0 && hl <= HEADLINE_MAX) score += 8;

  const bodyWords = ad.body.trim().split(/\s+/).length;
  if (bodyWords >= 15 && bodyWords <= 50) score += 15;
  else if (bodyWords > 0) score += 8;

  const ctaLen = ad.cta.length;
  if (ctaLen >= 5 && ctaLen <= CTA_MAX) score += 10;
  else if (ctaLen > 0) score += 5;

  if (VALID_TONES.has(ad.tone)) score += 5;

  return Math.min(100, score);
};

// ---------------------------------------------------------------------------
// Confidence scoring (0–100) — measures pipeline reliability
//
// Separate from quality: a well-written ad produced after two retries is
// high quality but lower confidence (the model needed correction).
// ---------------------------------------------------------------------------

export const computeConfidenceScore = (
  qualityScore: number,
  attempts: number,
  passedValidation: boolean,
): number => {
  let confidence = qualityScore;

  // Each retry beyond the first signals the model deviated from the schema
  if (attempts >= 2) confidence = Math.round(confidence * 0.82);

  // Accepted-with-warnings means schema rules were never fully satisfied
  if (!passedValidation) confidence = Math.round(confidence * 0.78);

  return Math.max(0, Math.min(100, confidence));
};
