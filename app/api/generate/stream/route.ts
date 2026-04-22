import { generateAdPipeline } from "@/lib/ai/pipeline";
import type { AdBrief, StreamEvent } from "@/types/ai";

const encoder = new TextEncoder();

const sseText = (event: StreamEvent): string =>
  `data: ${JSON.stringify(event)}\n\n`;

export async function POST(req: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return new Response(
      sseText({ type: "error", message: "API key not configured on the server." }),
      { status: 500, headers: { "Content-Type": "text/event-stream" } },
    );
  }

  const body = await req.json() as Record<string, unknown>;
  const brief: AdBrief = {
    product: String(body.product ?? "").trim(),
    audience: String(body.audience ?? "").trim(),
    platform: String(body.platform ?? "").trim(),
    tone: String(body.tone ?? "Persuasive").trim(),
  };

  if (!brief.product || !brief.audience || !brief.platform) {
    return new Response(
      sseText({ type: "error", message: "product, audience, and platform are required." }),
      { status: 400, headers: { "Content-Type": "text/event-stream" } },
    );
  }

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: StreamEvent) => {
        controller.enqueue(encoder.encode(sseText(event)));
      };

      try {
        await generateAdPipeline(brief, apiKey, emit);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unexpected pipeline error.";
        emit({ type: "error", message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
