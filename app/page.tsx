"use client";

import { useMemo, useState } from "react";
import { getScoreTone } from "./lib/score";
import type { AdOutput, AdPlan, PipelineResult, PipelineStage, StreamEvent } from "@/types/ai";

// ---------------------------------------------------------------------------
// UI-only types
// ---------------------------------------------------------------------------

type PlatformOption = {
  label: string;
  description: string;
  gradient: string;
  badge: string;
  border: string;
  soft: string;
};

type ToneOption = {
  label: string;
  description: string;
};

type PresetBrief = {
  label: string;
  product: string;
  audience: string;
  platform: string;
  tone: string;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PLATFORM_OPTIONS: PlatformOption[] = [
  {
    label: "Facebook",
    description: "Social-first hooks for broad conversion campaigns.",
    gradient: "from-sky-500 via-blue-500 to-indigo-500",
    badge: "bg-sky-100 text-sky-700",
    border: "border-sky-200",
    soft: "bg-sky-50",
  },
  {
    label: "Instagram",
    description: "Visual, punchy copy that feels native to the feed.",
    gradient: "from-fuchsia-500 via-pink-500 to-orange-400",
    badge: "bg-pink-100 text-pink-700",
    border: "border-pink-200",
    soft: "bg-pink-50",
  },
  {
    label: "LinkedIn",
    description: "Professional messaging with credibility and clarity.",
    gradient: "from-cyan-600 via-sky-600 to-blue-700",
    badge: "bg-cyan-100 text-cyan-700",
    border: "border-cyan-200",
    soft: "bg-cyan-50",
  },
  {
    label: "Google",
    description: "Intent-driven copy for search and performance placements.",
    gradient: "from-emerald-500 via-teal-500 to-cyan-500",
    badge: "bg-emerald-100 text-emerald-700",
    border: "border-emerald-200",
    soft: "bg-emerald-50",
  },
  {
    label: "TikTok",
    description: "Fast, direct language built for scroll-stopping intros.",
    gradient: "from-slate-900 via-slate-700 to-slate-500",
    badge: "bg-slate-200 text-slate-700",
    border: "border-slate-300",
    soft: "bg-slate-100",
  },
];

const DEFAULT_PLATFORM_META: PlatformOption = {
  label: "Creative Preview",
  description: "Choose a channel to tailor the feel of the ad.",
  gradient: "from-slate-900 via-slate-700 to-slate-500",
  badge: "bg-slate-100 text-slate-700",
  border: "border-slate-200",
  soft: "bg-slate-50",
};

const TONE_OPTIONS: ToneOption[] = [
  { label: "Persuasive", description: "Benefit-led and conversion-focused." },
  { label: "Professional", description: "Clear, credible, and polished." },
  { label: "Casual", description: "Friendly and approachable." },
  { label: "Urgent", description: "High-energy with momentum." },
];

const PRESET_BRIEFS: PresetBrief[] = [
  {
    label: "B2B SaaS",
    product: "AI productivity suite for distributed teams",
    audience: "Operations leads and remote-first managers who want fewer repetitive tasks",
    platform: "LinkedIn",
    tone: "Professional",
  },
  {
    label: "Creator Tool",
    product: "Short-form video editor powered by AI",
    audience: "Creators and brand marketers producing daily social content",
    platform: "Instagram",
    tone: "Casual",
  },
  {
    label: "Lead Gen",
    product: "Cybersecurity assessment for growing companies",
    audience: "IT leaders evaluating risk before scaling infrastructure",
    platform: "Google",
    tone: "Persuasive",
  },
];

const TAB_LABELS = {
  output: "Preview",
  suggestions: "Refine",
  variants: "Variants",
} as const;

const STAGE_LABELS: Record<PipelineStage, string> = {
  planning: "Planning strategy…",
  generating: "Generating copy…",
  validating: "Validating output…",
  retrying: "Refining (retry)…",
  complete: "Ready to export",
  error: "Generation failed",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const getStatusTone = (message: string | null) => {
  if (!message) return null;
  const n = message.toLowerCase();
  if (n.includes("wrong") || n.includes("failed") || n.includes("error")) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  if (n.includes("please")) return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
};

// ---------------------------------------------------------------------------
// Streaming reader
// ---------------------------------------------------------------------------

const readStream = async (
  res: Response,
  onEvent: (event: StreamEvent) => void,
): Promise<void> => {
  const reader = res.body?.getReader();
  if (!reader) throw new Error("No readable stream on response.");

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";

      for (const part of parts) {
        const line = part.trim();
        if (!line.startsWith("data: ")) continue;
        try {
          const event = JSON.parse(line.slice(6)) as StreamEvent;
          onEvent(event);
        } catch {
          // Ignore malformed chunks
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Home() {
  const [product, setProduct] = useState("");
  const [audience, setAudience] = useState("");
  const [platform, setPlatform] = useState("");
  const [tone, setTone] = useState("Persuasive");

  const [ad, setAd] = useState<AdOutput | null>(null);
  const [plan, setPlan] = useState<AdPlan | null>(null);
  const [score, setScore] = useState(0);
  const [confidenceScore, setConfidenceScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [pipelineStage, setPipelineStage] = useState<PipelineStage | "idle">("idle");
  const [activeTab, setActiveTab] = useState<"output" | "suggestions" | "variants">("output");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const isRunning = pipelineStage !== "idle" && pipelineStage !== "complete" && pipelineStage !== "error";

  const selectedPlatform = useMemo(() => {
    const norm = platform.trim().toLowerCase();
    const match = PLATFORM_OPTIONS.find((o) => o.label.toLowerCase() === norm);
    if (match) return match;
    if (!platform.trim()) return DEFAULT_PLATFORM_META;
    return { ...DEFAULT_PLATFORM_META, label: platform.trim(), description: "Custom placement preview." };
  }, [platform]);

  const selectedTone = useMemo(
    () => TONE_OPTIONS.find((o) => o.label === tone) ?? TONE_OPTIONS[0],
    [tone],
  );

  const suggestions = useMemo(() => {
    if (!ad) return [];
    return [
      {
        title: "Sharpen the CTA",
        body: `Test a higher-urgency close like "${ad.cta} Today" or "${ad.cta} Before Spots Fill".`,
      },
      {
        title: "Tighten the hook",
        body: `Try shortening the headline to 5–6 words for a quicker first impression on ${platform || "your chosen platform"}.`,
      },
      {
        title: "Lead with the payoff",
        body: `Open with the main benefit for ${audience || "your audience"} so the value lands before the feature list.`,
      },
    ];
  }, [ad, audience, platform]);

  const variants = useMemo(() => {
    if (!ad) return [];
    return [
      {
        title: "Benefit-first",
        body: `${product || ad.headline} helps ${audience || "your audience"} move faster with less friction.`,
      },
      {
        title: "Proof-led",
        body: `Built for ${platform || "high-performing channels"}, this angle highlights trust, clarity, and a stronger reason to act now.`,
      },
      {
        title: "Urgency-led",
        body: `${ad.headline}. Start now and give your audience a clear next step before attention drops.`,
      },
    ];
  }, [ad, audience, platform, product]);

  const hasFormValues = Boolean(product.trim() && audience.trim() && platform.trim());

  const requiredFieldsComplete = useMemo(
    () => [product.trim(), audience.trim(), platform.trim()].filter(Boolean).length,
    [product, audience, platform],
  );

  const briefCompletion = Math.round((requiredFieldsComplete / 3) * 100);
  const statusTone = getStatusTone(statusMessage);
  const scoreTone = getScoreTone(score);
  const confidenceTone = getScoreTone(confidenceScore);
  const outputState = pipelineStage === "idle"
    ? "Awaiting brief"
    : pipelineStage === "complete"
    ? "Ready to export"
    : STAGE_LABELS[pipelineStage as PipelineStage];

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const applyPreset = (preset: PresetBrief) => {
    setProduct(preset.product);
    setAudience(preset.audience);
    setPlatform(preset.platform);
    setTone(preset.tone);
    setStatusMessage(`${preset.label} preset loaded. Generate as-is or fine-tune the brief.`);
  };

  const clearBrief = () => {
    setProduct("");
    setAudience("");
    setPlatform("");
    setTone("Persuasive");
    setAd(null);
    setPlan(null);
    setScore(0);
    setConfidenceScore(0);
    setAttempts(0);
    setPipelineStage("idle");
    setActiveTab("output");
    setStatusMessage("Brief cleared. Start shaping a new concept.");
  };

  const generateAd = async () => {
    if (!hasFormValues) {
      setStatusMessage("Please fill in product, audience, and platform before generating.");
      return;
    }

    setPipelineStage("planning");
    setStatusMessage(null);
    setAd(null);
    setPlan(null);

    try {
      const res = await fetch("/api/generate/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product, audience, platform, tone }),
      });

      if (!res.ok || !res.body) {
        throw new Error("Stream request failed.");
      }

      let finalResult: PipelineResult | null = null;

      await readStream(res, (event) => {
        if (event.type === "stage") {
          setPipelineStage(event.stage);
        } else if (event.type === "plan") {
          setPlan(event.plan);
        } else if (event.type === "result") {
          finalResult = event.result;
          setAd(event.result.ad);
          setPlan(event.result.plan);
          setScore(event.result.score);
          setConfidenceScore(event.result.confidenceScore);
          setAttempts(event.result.attempts);
          setPipelineStage("complete");
          setActiveTab("output");
        } else if (event.type === "error") {
          throw new Error(event.message);
        }
      });

      if (!finalResult) throw new Error("Pipeline completed without a result.");

      const retryNote = (finalResult as PipelineResult).attempts > 1
        ? ` (refined in ${(finalResult as PipelineResult).attempts} attempts)`
        : "";
      setStatusMessage(`Generated successfully${retryNote}. Review the preview below.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      setStatusMessage(message);
      setPipelineStage("error");
    }
  };

  const copyToClipboard = async () => {
    if (!ad) return;
    try {
      await navigator.clipboard.writeText(`${ad.headline}\n\n${ad.body}\n\nCTA: ${ad.cta}`);
      setStatusMessage("Copied to clipboard.");
    } catch {
      setStatusMessage("Copy failed. Please try again.");
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(400px,0.92fr)] 2xl:grid-cols-[minmax(0,1.05fr)_minmax(500px,0.95fr)]">

      {/* Brief form */}
      <section className="overflow-hidden rounded-[30px] border border-white/70 bg-white/82 shadow-[0_28px_70px_-42px_rgba(15,23,42,0.28)] backdrop-blur">

        {/* Panel header */}
        <div className="border-b border-slate-200/80 px-6 py-5 sm:px-7">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-600">Creative brief</p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">Build your campaign</h2>
            </div>

            {/* Compact progress */}
            <div className="flex shrink-0 flex-col items-end gap-1">
              <span className="text-xs font-medium text-slate-400">{requiredFieldsComplete}/3 fields</span>
              <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-1.5 rounded-full bg-slate-950 transition-all duration-300"
                  style={{ width: `${briefCompletion}%` }}
                />
              </div>
            </div>
          </div>

          {/* Preset chips */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-slate-400">Try a preset:</span>
            {PRESET_BRIEFS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => applyPreset(preset)}
                disabled={isRunning}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {preset.label}
              </button>
            ))}
          </div>

          {statusMessage && statusTone ? (
            <div className={`mt-4 rounded-xl border px-4 py-2.5 text-sm font-medium ${statusTone}`}>
              {statusMessage}
            </div>
          ) : null}
        </div>

        {/* Fields */}
        <div className="space-y-5 p-6 sm:p-7">

          {/* Product */}
          <div>
            <label htmlFor="product" className="block text-sm font-semibold text-slate-900">
              Product / Offer
            </label>
            <input
              id="product"
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              disabled={isRunning}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-200/70 disabled:cursor-not-allowed disabled:opacity-60"
              placeholder="e.g., AI content assistant for fast-moving teams"
            />
          </div>

          {/* Audience */}
          <div>
            <label htmlFor="audience" className="block text-sm font-semibold text-slate-900">
              Target Audience
            </label>
            <textarea
              id="audience"
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              disabled={isRunning}
              rows={2}
              className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-200/70 disabled:cursor-not-allowed disabled:opacity-60"
              placeholder="e.g., founders and operators trying to ship campaigns faster with a lean team"
            />
          </div>

          {/* Platform */}
          <div>
            <p className="text-sm font-semibold text-slate-900">Platform</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {PLATFORM_OPTIONS.map((option) => {
                const active = option.label === platform;
                return (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() => setPlatform(option.label)}
                    disabled={isRunning}
                    className={`rounded-full px-4 py-1.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
                      active
                        ? `bg-gradient-to-r ${option.gradient} text-white shadow-md`
                        : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
            <input
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              disabled={isRunning}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-200/70 disabled:cursor-not-allowed disabled:opacity-60"
              placeholder="Or type a custom platform or placement"
            />
          </div>

          {/* Tone */}
          <div>
            <p className="text-sm font-semibold text-slate-900">Tone</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {TONE_OPTIONS.map((option) => {
                const active = option.label === tone;
                return (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() => setTone(option.label)}
                    disabled={isRunning}
                    className={`rounded-full px-4 py-1.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
                      active
                        ? "bg-slate-950 text-white shadow-sm"
                        : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
            {tone && (
              <p className="mt-1.5 text-xs text-slate-500">
                {selectedTone.description}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => applyPreset(PRESET_BRIEFS[0])}
              disabled={isRunning}
              className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Load Example
            </button>
            <button
              type="button"
              onClick={clearBrief}
              disabled={isRunning}
              className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={generateAd}
              disabled={isRunning}
              className="flex-1 rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-slate-900/15 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isRunning ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  {STAGE_LABELS[pipelineStage as PipelineStage] ?? "Running…"}
                </span>
              ) : ad ? "Regenerate" : "Generate Ad"}
            </button>
          </div>
        </div>
      </section>

      {/* Preview panel */}
      <section className="space-y-5 xl:sticky xl:top-24 xl:self-start">
        <div className="rounded-[30px] border border-white/70 bg-white/82 p-5 shadow-[0_28px_70px_-42px_rgba(15,23,42,0.28)] backdrop-blur sm:p-6">

          {/* Panel header */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-600">Live preview</p>
              <h3 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">Ad canvas</h3>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {attempts > 1 && (
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                  {attempts} attempts
                </span>
              )}
              <div className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
                pipelineStage === "error"
                  ? "bg-rose-100 text-rose-700"
                  : isRunning
                  ? "bg-indigo-100 text-indigo-700"
                  : "bg-slate-100 text-slate-500"
              }`}>
                {outputState}
              </div>
            </div>
          </div>

          {/* Strategy plan card */}
          {plan && (
            <div className="mt-4 rounded-[22px] border border-indigo-200 bg-indigo-50/80 p-4">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-700">
                  Strategy plan
                </span>
                <span className="text-xs text-indigo-500">{plan.tone} · {plan.ctaStyle} CTA</span>
              </div>
              <div className="mt-3 space-y-1">
                {plan.keyAngles.map((angle, i) => (
                  <p key={i} className="text-sm leading-6 text-indigo-800">
                    <span className="mr-2 font-semibold text-indigo-400">#{i + 1}</span>
                    {angle}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Planning skeleton */}
          {pipelineStage === "planning" && !plan && (
            <div className="mt-4 rounded-[22px] border border-indigo-200 bg-indigo-50/50 p-4">
              <div className="h-4 w-24 animate-pulse rounded bg-indigo-200" />
              <div className="mt-3 space-y-2">
                <div className="h-3.5 w-5/6 animate-pulse rounded bg-indigo-200" />
                <div className="h-3.5 w-4/6 animate-pulse rounded bg-indigo-200" />
                <div className="h-3.5 w-3/6 animate-pulse rounded bg-indigo-200" />
              </div>
            </div>
          )}

          {/* Ad preview card */}
          <div className={`mt-4 rounded-[28px] bg-gradient-to-br p-[1px] ${selectedPlatform.gradient}`}>
            <div className="rounded-[27px] bg-white p-5">
              {/* Platform + scores header */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${selectedPlatform.badge}`}>
                    {selectedPlatform.label}
                  </span>
                  <p className="mt-2 text-sm font-medium text-slate-900">Sponsored placement preview</p>
                  <p className="mt-0.5 text-xs leading-5 text-slate-500">{selectedPlatform.description}</p>
                </div>

                <div className="flex shrink-0 gap-2">
                  <div className={`rounded-2xl px-3 py-2 text-right ${scoreTone.track}`}>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Quality</p>
                    <p className="mt-0.5 text-xl font-semibold text-slate-950">{score}</p>
                    <p className={`mt-0.5 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${scoreTone.badge}`}>
                      {scoreTone.label}
                    </p>
                  </div>
                  {ad && (
                    <div className={`rounded-2xl px-3 py-2 text-right ${confidenceTone.track}`}>
                      <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Confidence</p>
                      <p className="mt-0.5 text-xl font-semibold text-slate-950">{confidenceScore}</p>
                      <p className={`mt-0.5 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${confidenceTone.badge}`}>
                        {confidenceTone.label}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Ad body */}
              <div className="mt-4 rounded-[24px] border border-slate-200 bg-slate-50/85 p-4">
                {isRunning && pipelineStage !== "planning" ? (
                  <div className="space-y-3">
                    <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
                    <div className="h-7 w-5/6 animate-pulse rounded bg-slate-200" />
                    <div className="h-4 w-full animate-pulse rounded bg-slate-200" />
                    <div className="h-4 w-full animate-pulse rounded bg-slate-200" />
                    <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200" />
                    <div className="h-10 w-36 animate-pulse rounded-full bg-slate-200" />
                  </div>
                ) : !ad ? (
                  <div className="text-center py-2">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Preview waiting</p>
                    <p className="mt-2 text-lg font-semibold tracking-tight text-slate-900">
                      Your generated ad will appear here.
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      Fill out the brief and hit Generate.
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${selectedPlatform.badge}`}>
                        {platform || selectedPlatform.label}
                      </span>
                      <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
                        {ad.tone}
                      </span>
                    </div>

                    <h4 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">{ad.headline}</h4>
                    <p className="mt-3 text-sm leading-7 text-slate-700">{ad.body}</p>

                    <button
                      type="button"
                      className="mt-4 rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-slate-900/15"
                    >
                      {ad.cta}
                    </button>

                    <div className="mt-4 grid gap-2 sm:grid-cols-3">
                      <div className={`rounded-xl border ${selectedPlatform.border} ${selectedPlatform.soft} p-3`}>
                        <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Audience fit</p>
                        <p className="mt-1 text-xs font-medium text-slate-800 line-clamp-2">{audience || "Defined in brief"}</p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white p-3">
                        <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Offer</p>
                        <p className="mt-1 text-xs font-medium text-slate-800 line-clamp-2">{product || "Current concept"}</p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white p-3">
                        <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Tone</p>
                        <p className="mt-1 text-xs font-medium text-slate-800">{selectedTone.label}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Tabs */}
              <div className="mt-4">
                <div className="mb-3 flex flex-wrap gap-2">
                  {(["output", "suggestions", "variants"] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveTab(tab)}
                      className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                        activeTab === tab
                          ? "bg-slate-950 text-white"
                          : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {TAB_LABELS[tab]}
                    </button>
                  ))}
                </div>

                {!isRunning && activeTab === "output" && (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Headline</p>
                      <p className="mt-1.5 text-sm font-semibold text-slate-900">
                        {ad?.headline || "Generated headline will appear here"}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Body copy</p>
                      <p className="mt-1.5 text-sm leading-6 text-slate-700">
                        {ad?.body || "Generated body copy will appear here after you run the prompt."}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">CTA</p>
                      <p className="mt-1.5 text-sm font-semibold text-slate-900">{ad?.cta || "Learn More"}</p>
                    </div>
                  </div>
                )}

                {!isRunning && activeTab === "suggestions" && (
                  <div className="space-y-2">
                    {suggestions.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/80 p-4 text-sm leading-6 text-slate-500">
                        Generate an ad first to unlock refinement ideas.
                      </div>
                    ) : (
                      suggestions.map((item) => (
                        <div key={item.title} className="rounded-xl border border-slate-200 bg-white p-3">
                          <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                          <p className="mt-1.5 text-sm leading-6 text-slate-600">{item.body}</p>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {!isRunning && activeTab === "variants" && (
                  <div className="space-y-2">
                    {variants.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/80 p-4 text-sm leading-6 text-slate-500">
                        Generate an ad first to see alternate angles based on your current brief.
                      </div>
                    ) : (
                      variants.map((variant) => (
                        <div key={variant.title} className="rounded-xl border border-slate-200 bg-white p-3">
                          <p className="text-sm font-semibold text-slate-900">{variant.title}</p>
                          <p className="mt-1.5 text-sm leading-6 text-slate-600">{variant.body}</p>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom actions */}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={copyToClipboard}
              disabled={!ad || isRunning}
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
            >
              Copy
            </button>
            <button
              type="button"
              onClick={generateAd}
              disabled={!ad || isRunning}
              className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
            >
              Refine Output
            </button>
            <button
              type="button"
              onClick={clearBrief}
              disabled={isRunning}
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Clear & Start Over
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
