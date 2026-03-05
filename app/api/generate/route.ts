import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { product, audience, platform } = await req.json();

  const prompt = `
Generate high-converting ad copy.

Product: ${product}
Audience: ${audience}
Platform: ${platform}

Return:
Headline:
Ad Copy:
CTA:
`;

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

  return NextResponse.json({
    result: data.choices?.[0]?.message?.content,
  });
}