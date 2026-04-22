import { NextResponse } from "next/server";
import { generateAdPipeline } from "@/lib/ai/pipeline";
import type { AdBrief } from "@/types/ai";

export async function POST(req: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API key not configured on the server." }, { status: 500 });
  }

  const body = await req.json() as Record<string, unknown>;
  const brief: AdBrief = {
    product: String(body.product ?? "").trim(),
    audience: String(body.audience ?? "").trim(),
    platform: String(body.platform ?? "").trim(),
    tone: String(body.tone ?? "Persuasive").trim(),
  };

  if (!brief.product || !brief.audience || !brief.platform) {
    return NextResponse.json(
      { error: "product, audience, and platform are required." },
      { status: 400 },
    );
  }

  const result = await generateAdPipeline(brief, apiKey);

  if (!result.success || !result.ad) {
    return NextResponse.json({ error: result.error ?? "Generation failed." }, { status: 500 });
  }

  return NextResponse.json(result);
}
