import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { product, audience, platform, tone } = await req.json();

  const prompt = [
    "Generate high-converting ad copy.",
    "",
    `Product: ${product}`,
    `Audience: ${audience}`,
    `Platform: ${platform}`,
    `Tone: ${tone || "Persuasive"}`,
    "",
    "Make the copy feel native to the selected platform, concise, benefit-led, and easy to scan.",
    "Return exactly in this format:",
    "Headline:",
    "Ad Copy:",
    "CTA:",
  ].join("\n");

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "meta-llama/llama-3-8b-instruct",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    return NextResponse.json(
      {
        error: data?.error?.message || "Generation failed.",
      },
      { status: response.status },
    );
  }

  return NextResponse.json({
    result: data.choices?.[0]?.message?.content,
  });
}
