"use client";

import { useEffect, useMemo, useState } from "react";

type AdOutput = {
  headline: string;
  copy: string;
  cta: string;
  score: number;
  raw: string;
};

type SavedAd = {
  id: string;
  title: string;
  platform: string;
  audience: string;
  score: number;
  date: string;
  output: AdOutput;
};

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

const HISTORY_STORAGE_KEY = "adsHistory";
const HISTORY_LIMIT = 30;

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

const parseAIText = (text: string): AdOutput => {
  const headlineMatch = /Headline:\s*(.*)/i.exec(text);
  const copyMatch = /Ad Copy:\s*([\s\S]*?)(?=CTA:|$)/i.exec(text);
  const ctaMatch = /CTA:\s*(.*)/i.exec(text);

  const headline = headlineMatch?.[1]?.trim() || "Optimized Headline";
  const copy = copyMatch?.[1]?.trim() || text.trim();
  const cta = ctaMatch?.[1]?.trim() || "Learn More";
  const score = Math.max(60, Math.min(100, Math.round(70 + headline.length * 0.5)));

  return { headline, copy, cta, score, raw: text.trim() };
};

const getHistory = (): SavedAd[] => {
  if (typeof window === "undefined") return [];

  try {
    const payload = window.localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!payload) return [];
    return JSON.parse(payload);
  } catch {
    return [];
  }
};

const saveHistory = (history: SavedAd[]) => {
  window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
};

const createId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `ad-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const getStatusTone = (message: string | null) => {
  if (!message) return null;

  const normalized = message.toLowerCase();

  if (normalized.includes("wrong") || normalized.includes("failed")) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  if (normalized.includes("please")) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-700";
};

const getScoreTone = (score: number) => {
  if (score >= 90) {
    return {
      label: "Excellent",
      badge: "bg-emerald-100 text-emerald-700",
      meter: "bg-emerald-500",
      soft: "bg-emerald-50",
    };
  }

  if (score >= 75) {
    return {
      label: "Strong",
      badge: "bg-sky-100 text-sky-700",
      meter: "bg-sky-500",
      soft: "bg-sky-50",
    };
  }

  return {
    label: "Needs work",
    badge: "bg-amber-100 text-amber-700",
    meter: "bg-amber-500",
    soft: "bg-amber-50",
  };
};

const formatDate = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(date);
};

export default function Home() {
  const [product, setProduct] = useState("");
  const [audience, setAudience] = useState("");
  const [platform, setPlatform] = useState("");
  const [tone, setTone] = useState("Persuasive");
  const [ad, setAd] = useState<AdOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"output" | "suggestions" | "variants">("output");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [history, setHistory] = useState<SavedAd[]>([]);

  useEffect(() => {
    setHistory(getHistory());
  }, []);

  const selectedPlatform = useMemo(() => {
    const normalizedPlatform = platform.trim().toLowerCase();

    const option = PLATFORM_OPTIONS.find((item) => item.label.toLowerCase() === normalizedPlatform);

    if (option) return option;
    if (!platform.trim()) return DEFAULT_PLATFORM_META;

    return {
      ...DEFAULT_PLATFORM_META,
      label: platform.trim(),
      description: "Custom placement preview using your selected brief.",
    };
  }, [platform]);

  const selectedTone = useMemo(() => {
    return TONE_OPTIONS.find((item) => item.label === tone) ?? TONE_OPTIONS[0];
  }, [tone]);

  const suggestions = useMemo(() => {
    if (!ad) return [];

    return [
      {
        title: "Sharpen the CTA",
        body: `Test a higher-urgency close like "${ad.cta} Today" or "${ad.cta} Before Spots Fill".`,
      },
      {
        title: "Tighten the hook",
        body: `Try shortening the headline to the first 5-6 words for a quicker first impression on ${platform || "your chosen platform"}.`,
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

  const requiredFieldsComplete = useMemo(() => {
    return [product.trim(), audience.trim(), platform.trim()].filter(Boolean).length;
  }, [audience, platform, product]);

  const briefCompletion = Math.round((requiredFieldsComplete / 3) * 100);
  const recentHistory = useMemo(() => history.slice(0, 3), [history]);
  const scoreProgress = ad?.score ?? 0;
  const statusTone = getStatusTone(statusMessage);
  const scoreTone = getScoreTone(scoreProgress);
  const outputState = loading ? "Generating" : ad ? "Ready to export" : "Awaiting brief";

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
    setActiveTab("output");
    setStatusMessage("Brief cleared. Start shaping a new concept.");
  };

  const generateAd = async () => {
    if (!hasFormValues) {
      setStatusMessage("Please fill in product, audience, and platform before generating.");
      return;
    }

    setLoading(true);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product, audience, platform, tone }),
      });

      if (!res.ok) {
        throw new Error("request_failed");
      }

      const data = await res.json();
      const result = typeof data.result === "string" ? data.result : "";

      if (!result.trim()) {
        throw new Error("empty_result");
      }

      const out = parseAIText(result);
      setAd(out);
      setActiveTab("output");
      setStatusMessage("Generated successfully. Review the preview, then save the strongest version.");
    } catch {
      setStatusMessage("Something went wrong while generating. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (!ad) return;

    try {
      await navigator.clipboard.writeText(`${ad.headline}\n\n${ad.copy}\n\nCTA: ${ad.cta}`);
      setStatusMessage("Copied to clipboard.");
    } catch {
      setStatusMessage("Copy failed. Please try again.");
    }
  };

  const saveAd = () => {
    if (!ad) return;

    const item: SavedAd = {
      id: createId(),
      title: product || ad.headline,
      platform: platform || "General",
      audience: audience || "All",
      score: ad.score,
      date: new Date().toISOString(),
      output: ad,
    };

    const nextHistory = [item, ...history].slice(0, HISTORY_LIMIT);
    setHistory(nextHistory);
    saveHistory(nextHistory);
    setStatusMessage("Saved to history.");
  };

  return (
    <div className="space-y-8 xl:space-y-10">
      <section className="relative overflow-hidden rounded-[32px] bg-slate-950 px-6 py-8 text-white shadow-[0_36px_90px_-44px_rgba(15,23,42,0.82)] sm:px-8 lg:px-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.22),_transparent_30%),radial-gradient(circle_at_80%_15%,_rgba(59,130,246,0.20),_transparent_26%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.16),_transparent_26%)]" />

        <div className="relative grid gap-8 xl:grid-cols-[minmax(0,1.45fr)_360px] xl:items-end">
          <div>
            <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-200">
              Generator Studio
            </span>

            <h2 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl xl:text-[2.9rem]">
              Build platform-ready ads in a cleaner, faster creative workspace.
            </h2>

            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
              Shape the brief, pick the channel, and review a presentation-ready preview without losing context.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              {PRESET_BRIEFS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/18"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/10 p-5 backdrop-blur-xl">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-300">Workspace pulse</p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-white/8 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Saved library</p>
                <p className="mt-2 text-3xl font-semibold text-white">{history.length}</p>
              </div>

              <div className="rounded-2xl bg-white/8 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Current channel</p>
                <p className="mt-2 text-lg font-semibold text-white">{platform || "Not set"}</p>
              </div>

              <div className="rounded-2xl bg-white/8 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Tone</p>
                <p className="mt-2 text-lg font-semibold text-white">{tone}</p>
              </div>

              <div className="rounded-2xl bg-white/8 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Output state</p>
                <p className="mt-2 text-lg font-semibold text-white">{outputState}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(400px,0.92fr)] 2xl:grid-cols-[minmax(0,1.05fr)_minmax(500px,0.95fr)]">
        <section className="overflow-hidden rounded-[30px] border border-white/70 bg-white/82 shadow-[0_28px_70px_-42px_rgba(15,23,42,0.28)] backdrop-blur">
          <div className="border-b border-slate-200/80 px-6 py-6 sm:px-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-medium text-sky-700">Creative brief</p>
                <h3 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Define the campaign</h3>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  Start with the essentials, then choose the platform and tone that should shape the final ad.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-4 shadow-inner shadow-white/70 lg:w-full lg:max-w-[250px]">
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  <span>Brief completion</span>
                  <span>{briefCompletion}%</span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-slate-200">
                  <div className="h-2 rounded-full bg-slate-950 transition-all" style={{ width: `${briefCompletion}%` }} />
                </div>
                <p className="mt-3 text-sm text-slate-600">
                  {requiredFieldsComplete}/3 required fields complete. Tone is ready and can be adjusted anytime.
                </p>
              </div>
            </div>

            {statusMessage && statusTone ? (
              <div className={`mt-5 rounded-2xl border px-4 py-3 text-sm font-medium ${statusTone}`}>
                {statusMessage}
              </div>
            ) : null}
          </div>

          <div className="grid gap-8 p-6 sm:p-7 xl:grid-cols-[minmax(0,1fr)_290px]">
            <div className="space-y-6">
              <div className="rounded-[26px] border border-slate-200 bg-white/85 p-5 shadow-sm shadow-slate-900/5">
                <label className="block" htmlFor="product">
                  <span className="text-sm font-semibold text-slate-900">Product / Offer</span>
                  <span className="mt-1 block text-sm text-slate-500">
                    Name the product clearly so the model can build a strong benefit-led message.
                  </span>
                </label>
                <input
                  id="product"
                  value={product}
                  onChange={(e) => setProduct(e.target.value)}
                  className="mt-4 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-200/70"
                  placeholder="e.g., AI content assistant for fast-moving teams"
                />
              </div>

              <div className="rounded-[26px] border border-slate-200 bg-white/85 p-5 shadow-sm shadow-slate-900/5">
                <label className="block" htmlFor="audience">
                  <span className="text-sm font-semibold text-slate-900">Target Audience</span>
                  <span className="mt-1 block text-sm text-slate-500">
                    Describe who the ad is for and what context or pain point they care about.
                  </span>
                </label>
                <textarea
                  id="audience"
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  rows={4}
                  className="mt-4 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-200/70"
                  placeholder="e.g., founders and operators trying to ship campaigns faster with a lean team"
                />
              </div>

              <div className="rounded-[26px] border border-slate-200 bg-white/85 p-5 shadow-sm shadow-slate-900/5">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-semibold text-slate-900">Platform</p>
                  <p className="text-sm text-slate-500">
                    Pick a common channel quickly or type a custom placement below.
                  </p>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {PLATFORM_OPTIONS.map((option) => {
                    const active = option.label === platform;

                    return (
                      <button
                        key={option.label}
                        type="button"
                        onClick={() => setPlatform(option.label)}
                        className={`rounded-[22px] border px-4 py-4 text-left transition ${
                          active
                            ? `${option.border} ${option.soft} shadow-md shadow-slate-900/5`
                            : "border-slate-200 bg-slate-50/80 hover:border-slate-300 hover:bg-white"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-semibold text-slate-900">{option.label}</span>
                          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${option.badge}`}>
                            {active ? "Selected" : "Channel"}
                          </span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{option.description}</p>
                      </button>
                    );
                  })}
                </div>

                <input
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="mt-4 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-200/70"
                  placeholder="Or type a custom platform or placement"
                />
              </div>

              <div className="rounded-[26px] border border-slate-200 bg-white/85 p-5 shadow-sm shadow-slate-900/5">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-semibold text-slate-900">Tone</p>
                  <p className="text-sm text-slate-500">Dial in how the copy should feel before you generate.</p>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {TONE_OPTIONS.map((option) => {
                    const active = option.label === tone;

                    return (
                      <button
                        key={option.label}
                        type="button"
                        onClick={() => setTone(option.label)}
                        className={`rounded-[22px] border px-4 py-4 text-left transition ${
                          active
                            ? "border-slate-950 bg-slate-950 text-white shadow-md shadow-slate-900/10"
                            : "border-slate-200 bg-slate-50/80 hover:border-slate-300 hover:bg-white"
                        }`}
                      >
                        <p className={`text-sm font-semibold ${active ? "text-white" : "text-slate-900"}`}>
                          {option.label}
                        </p>
                        <p className={`mt-2 text-sm leading-6 ${active ? "text-slate-300" : "text-slate-600"}`}>
                          {option.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => applyPreset(PRESET_BRIEFS[0])}
                  className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Load Example
                </button>
                <button
                  type="button"
                  onClick={clearBrief}
                  className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Clear Brief
                </button>
                <button
                  type="button"
                  onClick={generateAd}
                  disabled={loading}
                  className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/15 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {loading ? "Generating..." : "Generate Ad"}
                </button>
              </div>
            </div>

            <aside className="space-y-4">
              <section className="rounded-[26px] border border-slate-200 bg-slate-50/85 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Brief snapshot</p>
                <div className="mt-4 space-y-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Offer</p>
                    <p className="mt-1 text-sm font-medium leading-6 text-slate-800">
                      {product || "Add a product or offer"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Audience</p>
                    <p className="mt-1 text-sm leading-6 text-slate-700">
                      {audience || "Define who the ad should speak to"}
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                    <div className="rounded-2xl bg-white p-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Channel</p>
                      <p className="mt-1 text-sm font-medium text-slate-800">{platform || "Not selected"}</p>
                    </div>
                    <div className="rounded-2xl bg-white p-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Tone</p>
                      <p className="mt-1 text-sm font-medium text-slate-800">{selectedTone.label}</p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-[26px] border border-slate-200 bg-slate-50/85 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Recent saves</p>
                    <p className="mt-1 text-sm text-slate-500">Pulled from your local history.</p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500">
                    {history.length}
                  </span>
                </div>

                {recentHistory.length === 0 ? (
                  <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm leading-6 text-slate-500">
                    Save a generated ad and the latest concepts will appear here for quick reference.
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    {recentHistory.map((item) => (
                      <div key={item.id} className="rounded-2xl bg-white p-4">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-semibold text-slate-900">{item.platform}</span>
                          <span className="text-xs text-slate-500">{formatDate(item.date)}</span>
                        </div>
                        <p className="mt-2 text-sm font-medium leading-6 text-slate-800">{item.title}</p>
                        <p className="mt-2 text-xs text-slate-500">Score {item.score}</p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </aside>
          </div>
        </section>

        <section className="space-y-5 xl:sticky xl:top-24 xl:self-start">
          <div className="rounded-[30px] border border-white/70 bg-white/82 p-5 shadow-[0_28px_70px_-42px_rgba(15,23,42,0.28)] backdrop-blur sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-sky-700">Live preview</p>
                <h3 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Ad canvas</h3>
              </div>
              <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                {outputState}
              </div>
            </div>

            <div className={`mt-5 rounded-[28px] bg-gradient-to-br p-[1px] ${selectedPlatform.gradient}`}>
              <div className="rounded-[27px] bg-white p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${selectedPlatform.badge}`}>
                      {selectedPlatform.label}
                    </span>
                    <p className="mt-3 text-sm font-medium text-slate-900">Sponsored placement preview</p>
                    <p className="mt-1 text-sm leading-6 text-slate-500">{selectedPlatform.description}</p>
                  </div>

                  <div className={`rounded-2xl px-4 py-3 text-right ${scoreTone.soft}`}>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Score</p>
                    <p className="mt-1 text-2xl font-semibold text-slate-950">{scoreProgress}</p>
                    <p className={`mt-1 inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${scoreTone.badge}`}>
                      {scoreTone.label}
                    </p>
                  </div>
                </div>

                <div className="mt-6 rounded-[24px] border border-slate-200 bg-slate-50/85 p-5">
                  {loading ? (
                    <div className="space-y-4">
                      <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
                      <div className="h-8 w-5/6 animate-pulse rounded bg-slate-200" />
                      <div className="h-4 w-full animate-pulse rounded bg-slate-200" />
                      <div className="h-4 w-full animate-pulse rounded bg-slate-200" />
                      <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200" />
                      <div className="h-11 w-40 animate-pulse rounded-full bg-slate-200" />
                    </div>
                  ) : !ad ? (
                    <div className="text-center">
                      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Preview waiting</p>
                      <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
                        Your generated ad will appear here.
                      </p>
                      <p className="mt-3 text-sm leading-6 text-slate-500">
                        Fill out the brief, then generate to see a polished preview with score, CTA, and refinements.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${selectedPlatform.badge}`}>
                          {platform || selectedPlatform.label}
                        </span>
                        <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
                          {tone}
                        </span>
                      </div>

                      <h4 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">{ad.headline}</h4>
                      <p className="mt-4 text-sm leading-7 text-slate-700">{ad.copy}</p>

                      <button
                        type="button"
                        className="mt-5 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/15"
                      >
                        {ad.cta}
                      </button>

                      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <div className={`rounded-2xl border ${selectedPlatform.border} ${selectedPlatform.soft} p-4`}>
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Audience fit</p>
                          <p className="mt-1 text-sm font-medium text-slate-800">{audience || "Defined in brief"}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Offer</p>
                          <p className="mt-1 text-sm font-medium text-slate-800">{product || "Current concept"}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Tone</p>
                          <p className="mt-1 text-sm font-medium text-slate-800">{selectedTone.label}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-5">
                  <div className="mb-4 flex flex-wrap gap-2">
                    {(["output", "suggestions", "variants"] as const).map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setActiveTab(tab)}
                        className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                          activeTab === tab
                            ? "bg-slate-950 text-white"
                            : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {TAB_LABELS[tab]}
                      </button>
                    ))}
                  </div>

                  {!loading && activeTab === "output" && (
                    <div className="space-y-4">
                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Headline</p>
                        <p className="mt-2 text-base font-semibold text-slate-900">
                          {ad?.headline || "Generated headline will appear here"}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Body copy</p>
                        <p className="mt-2 text-sm leading-7 text-slate-700">
                          {ad?.copy || "Generated body copy will appear here after you run the prompt."}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">CTA</p>
                        <p className="mt-2 text-sm font-semibold text-slate-900">{ad?.cta || "Learn More"}</p>
                      </div>
                    </div>
                  )}

                  {!loading && activeTab === "suggestions" && (
                    <div className="space-y-3">
                      {suggestions.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-5 text-sm leading-6 text-slate-500">
                          Generate an ad first to unlock refinement ideas.
                        </div>
                      ) : (
                        suggestions.map((item) => (
                          <div key={item.title} className="rounded-2xl border border-slate-200 bg-white p-4">
                            <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                            <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {!loading && activeTab === "variants" && (
                    <div className="space-y-3">
                      {variants.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-5 text-sm leading-6 text-slate-500">
                          Generate an ad first to see alternate angles based on your current brief.
                        </div>
                      ) : (
                        variants.map((variant) => (
                          <div key={variant.title} className="rounded-2xl border border-slate-200 bg-white p-4">
                            <p className="text-sm font-semibold text-slate-900">{variant.title}</p>
                            <p className="mt-2 text-sm leading-6 text-slate-600">{variant.body}</p>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={copyToClipboard}
                disabled={!ad}
                className="rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
              >
                Copy
              </button>
              <button
                type="button"
                onClick={saveAd}
                disabled={!ad}
                className="rounded-full bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-emerald-300"
              >
                Save to History
              </button>
              <button
                type="button"
                onClick={() => setStatusMessage("Edit the brief on the left to refine the next generation.")}
                className="rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Refine Brief
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
