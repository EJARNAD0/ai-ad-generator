export const OPENROUTER_URL =
  process.env.OPENROUTER_URL ?? "https://openrouter.ai/api/v1/chat/completions";

export const MODEL =
  process.env.OPENROUTER_MODEL ?? "meta-llama/llama-3-8b-instruct";

export const LLM_TIMEOUT_MS = 30_000;
