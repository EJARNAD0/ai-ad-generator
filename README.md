# AI Ad Generator

An AI-powered advertising copy workspace that generates platform-optimized ad creative for Facebook, Instagram, LinkedIn, Google, TikTok, and more — in seconds.

Built on a structured multi-step pipeline with a dedicated planning step, SSE streaming, validation, automatic retry, quality + confidence scoring, and structured observability.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8?logo=tailwindcss)
![OpenRouter](https://img.shields.io/badge/LLM-OpenRouter-purple)

---

## Features

- **Planning Step** — Before generating copy, a dedicated LLM call produces a structured `AdPlan` (tone, target audience, key angles, CTA style) that anchors the generation prompt
- **SSE Streaming** — Pipeline stages emit Server-Sent Events so the UI updates in real time: planning → generating → validating → complete
- **Structured JSON Output** — The model returns strict JSON; a parser with fallback handling validates every field before results reach the client
- **Multi-Step Pipeline** — Plan → Generate → Validate → Auto-Retry with a corrective prompt on failure
- **Quality + Confidence Scoring** — Separate 0–100 scores: quality measures output richness, confidence measures pipeline reliability (penalised by retries and schema failures)
- **Structured Observability** — Every pipeline step is logged at `info`/`warn`/`error` with JSON payloads (stage, duration, attempt count, issue list)
- **Multi-Platform Support** — Tailored output for Facebook, Instagram, LinkedIn, Google, TikTok, or any custom platform
- **Tone Control** — Choose from Persuasive, Professional, Casual, or Urgent
- **Preset Briefs** — One-click templates for B2B SaaS, Creator Tools, and Lead Gen campaigns
- **Copy to Clipboard** — One-click export of the full ad (headline + body + CTA)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 16](https://nextjs.org) (App Router) |
| Language | TypeScript 5 (strict mode) |
| Styling | Tailwind CSS 4 |
| LLM API | [OpenRouter](https://openrouter.ai) — `meta-llama/llama-3-8b-instruct` |
| Deployment | Vercel |

---

## Getting Started

### Prerequisites

- Node.js 18+
- An [OpenRouter API key](https://openrouter.ai/keys)

### Installation

```bash
git clone https://github.com/your-username/ai-ad-generator.git
cd ai-ad-generator
npm install
```

### Environment Setup

```bash
cp .env.local.example .env.local
```

Open `.env.local` and fill in your key:

```env
# Required
OPENROUTER_API_KEY=sk-or-v1-your-key-here

# Optional — override the model or API URL
# OPENROUTER_MODEL=meta-llama/llama-3-8b-instruct
# OPENROUTER_URL=https://openrouter.ai/api/v1/chat/completions
```

Your API key is only used server-side in the `/api/generate` routes — it is never exposed to the browser.

### Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## System Architecture

```
app/
├── api/generate/
│   ├── route.ts           # POST /api/generate — batch (returns full result)
│   └── stream/route.ts    # POST /api/generate/stream — SSE streaming endpoint
├── page.tsx               # Generator UI with real-time stage display
├── components/MainLayout.tsx
└── lib/score.ts           # UI score-band utility

lib/ai/
├── config.ts              # Shared constants: MODEL, OPENROUTER_URL, LLM_TIMEOUT_MS
├── pipeline.ts            # generateAdPipeline — orchestrates plan + generate + validate
├── planner.ts             # planAdStructure — standalone LLM call, returns AdPlan
├── prompts.ts             # System, user, and corrective prompt builders (plan-aware)
├── validator.ts           # parseAdOutput, validateAd, scoreAd, computeConfidenceScore
└── logger.ts              # Structured JSON logger (info / warn / error)

types/
└── ai.ts                  # All shared types: AdBrief, AdPlan, AdOutput, PipelineResult, StreamEvent
```

---

## AI Pipeline

Every request flows through a five-stage pipeline. Both API routes use the same `generateAdPipeline` function — the streaming route passes an `onEvent` callback; the batch route does not.

```
POST /api/generate/stream  (SSE)
POST /api/generate         (JSON)
         │
         ▼
  generateAdPipeline(brief, apiKey, onEvent?)
         │
         ├─ Stage 1: plan
         │     planAdStructure(brief)  ──▶  LLM call  ──▶  AdPlan | null
         │     emit({ type: "plan", plan })
         │
         ├─ Stage 2: generate
         │     buildUserPrompt(brief, plan)  ──▶  LLM call  ──▶  raw string
         │     emit({ type: "stage", stage: "generating" })
         │
         ├─ Stage 3: validate
         │     parseAdOutput(raw)  ──▶  AdOutput | null
         │     validateAd(output)  ──▶  ValidationResult
         │     emit({ type: "stage", stage: "validating" })
         │
         ├─ [if invalid] Stage 4: regenerate
         │     buildCorrectivePrompt(brief, issues, plan)  ──▶  LLM call
         │     parseAdOutput + validateAd again
         │     emit({ type: "stage", stage: "retrying", attempt })
         │
         └─ scoreAd + computeConfidenceScore
               emit({ type: "result", result })
               return PipelineResult { ad, plan, score, confidenceScore, attempts, steps }
```

**Max attempts:** 2. On the final attempt the pipeline accepts partial results rather than returning empty, so the user always sees output.

### Planning Step

`planAdStructure` runs a separate, lightweight LLM call before generation. It returns a structured `AdPlan`:

```ts
type AdPlan = {
  tone: "Persuasive" | "Professional" | "Casual" | "Urgent";
  targetAudience: string;
  keyAngles: string[];       // 2–3 angles to anchor the copy
  ctaStyle: "soft" | "aggressive";
};
```

Planning failure is non-fatal — if the planner returns `null`, generation proceeds without a plan. The plan is displayed in the UI as a "Strategy plan" card as soon as it arrives via SSE.

---

## Streaming (SSE)

The `/api/generate/stream` endpoint emits `text/event-stream` events as the pipeline progresses. Each event is a JSON-encoded `StreamEvent`:

```ts
type StreamEvent =
  | { type: "stage";  stage: PipelineStage; attempt?: number }
  | { type: "plan";   plan: AdPlan }
  | { type: "result"; result: PipelineResult }
  | { type: "error";  message: string };
```

The client reads the stream with a `ReadableStreamDefaultReader`, decodes SSE lines, and updates React state incrementally — stage labels, the plan card, and the final ad all render as data arrives rather than on a single response flush.

---

## Prompt Strategy

Prompt construction lives in [`lib/ai/prompts.ts`](lib/ai/prompts.ts).

**System prompt** — sets the model's persona and enforces the JSON contract:

```
You are an expert advertising copywriter...
You MUST return a single valid JSON object with exactly these four fields:
{ "headline", "body", "cta", "tone" }
Return ONLY the JSON object — no markdown, no code fences.
```

**User prompt** — built from the brief (product, audience, platform, tone) plus optional plan context (key angles, CTA style) injected when a plan is available.

**Corrective prompt** — used on retry; includes the original brief, the plan, and a bulleted list of exactly which validation issues the previous attempt had.

---

## Validation & Scoring

All logic lives in [`lib/ai/validator.ts`](lib/ai/validator.ts).

### parseAdOutput

Strips markdown code fences, then `JSON.parse`s the response. Returns `null` on any failure — no exceptions propagate.

### validateAd

| Field | Rule |
|---|---|
| `headline` | Required, max 80 characters |
| `body` | Required, non-empty |
| `cta` | Required, max 30 characters |
| `tone` | Must be one of: `Persuasive`, `Professional`, `Casual`, `Urgent` |

### scoreAd — Quality (0–100)

Measures output richness:

| Factor | Max points |
|---|---|
| Headline 20–60 chars (ideal) | 15 |
| Body 15–50 words (ideal) | 15 |
| CTA 5–30 chars | 10 |
| Valid tone field | 5 |
| Base score | 55 |

### computeConfidenceScore — Confidence (0–100)

Measures pipeline reliability — separate from quality because a well-written ad produced after two retries is high quality but lower confidence:

- Quality score is the starting point
- Retry penalty: ×0.82 if `attempts ≥ 2`
- Warning penalty: ×0.78 if accepted with schema violations on the final attempt

---

## Observability

The structured logger in [`lib/ai/logger.ts`](lib/ai/logger.ts) emits JSON to `console` at three levels:

```ts
logger.info("validate", { attempt: 1, result: "passed", score: 87, confidenceScore: 87 });
logger.warn("validate", { attempt: 1, issues: [...] });
logger.error("generate", { attempt: 1, error: "HTTP 429" });
```

Every pipeline stage logs a `durationMs` field so per-step latency is visible in server logs without any additional instrumentation.

---

## TypeScript Types

All shared types live in [`types/ai.ts`](types/ai.ts):

```ts
type AdBrief    = { product, audience, platform, tone }
type AdPlan     = { tone, targetAudience, keyAngles, ctaStyle }
type AdOutput   = { headline, body, cta, tone }
type PipelineResult = {
  success: boolean
  ad: AdOutput | null
  plan: AdPlan | null
  score: number
  confidenceScore: number
  attempts: number
  steps: PipelineStep[]
  error?: string
}
type StreamEvent =
  | { type: "stage";  stage: PipelineStage; attempt?: number }
  | { type: "plan";   plan: AdPlan }
  | { type: "result"; result: PipelineResult }
  | { type: "error";  message: string }
```

---

## Project Structure

```
ai-ad-generator/
├── app/
│   ├── api/
│   │   └── generate/
│   │       ├── route.ts          # Batch endpoint
│   │       └── stream/route.ts   # SSE streaming endpoint
│   ├── components/MainLayout.tsx
│   ├── lib/score.ts
│   ├── page.tsx
│   ├── layout.tsx
│   └── globals.css
├── lib/
│   └── ai/
│       ├── config.ts         # MODEL, OPENROUTER_URL, LLM_TIMEOUT_MS
│       ├── pipeline.ts
│       ├── planner.ts
│       ├── prompts.ts
│       ├── validator.ts
│       └── logger.ts
├── types/
│   └── ai.ts
├── public/
├── .env.local.example
└── package.json
```

---

## Available Scripts

```bash
npm run dev      # Development server
npm run build    # Production build
npm start        # Production server
npm run lint     # ESLint
```

---

## Deployment

Optimized for [Vercel](https://vercel.com):

1. Push to GitHub
2. Import at [vercel.com/new](https://vercel.com/new)
3. Add `OPENROUTER_API_KEY` as an environment variable
4. Deploy

---

## License

MIT
