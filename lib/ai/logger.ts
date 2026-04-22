// Structured observability logger.
// Every entry uses the same shape so logs can be parsed, aggregated,
// or forwarded to an external sink (Datadog, Axiom, etc.) without reformatting.

export type LogEntry = {
  step: string;
  timestamp: string;
  success: boolean;
  details: Record<string, unknown>;
};

type LogLevel = "info" | "warn" | "error";

const write = (level: LogLevel, entry: LogEntry): void => {
  const line = `[ai-pipeline] ${JSON.stringify(entry)}`;
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
};

const makeEntry = (
  step: string,
  success: boolean,
  details: Record<string, unknown> = {},
): LogEntry => ({
  step,
  timestamp: new Date().toISOString(),
  success,
  details,
});

export const logger = {
  info: (step: string, details?: Record<string, unknown>): void =>
    write("info", makeEntry(step, true, details)),

  warn: (step: string, details?: Record<string, unknown>): void =>
    write("warn", makeEntry(step, false, details)),

  error: (step: string, details?: Record<string, unknown>): void =>
    write("error", makeEntry(step, false, details)),
};
