"use client";

import { useState } from "react";

export default function Home() {
  const [product, setProduct] = useState("");
  const [audience, setAudience] = useState("");
  const [platform, setPlatform] = useState("");
  const [tone, setTone] = useState("Persuasive");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const generateAd = async () => {
    setLoading(true);

    const res = await fetch("/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ product, audience, platform, tone }),
    });

    const data = await res.json();
    setResult(data.result);
    setLoading(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(result);
  };

  const fillExample = () => {
    setProduct("AI Productivity Tool");
    setAudience("Freelancers and remote workers");
    setPlatform("Facebook");
    setTone("Persuasive");
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl bg-white shadow-2xl rounded-xl p-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-800">
            AI Ad Copy Generator
          </h1>
          <p className="text-gray-500 text-sm">
            Generate high-converting ad copy in seconds
          </p>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <input
            placeholder="Product / Offer"
            value={product}
            className="w-full border border-gray-400 bg-gray-50 text-gray-800 placeholder-gray-500 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            onChange={(e) => setProduct(e.target.value)}
          />

          <input
            placeholder="Target Audience"
            value={audience}
            className="w-full border border-gray-400 bg-gray-50 text-gray-800 placeholder-gray-500 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            onChange={(e) => setAudience(e.target.value)}
          />

          <input
            placeholder="Platform (Facebook, Google, TikTok)"
            value={platform}
            className="w-full border border-gray-400 bg-gray-50 text-gray-800 placeholder-gray-500 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            onChange={(e) => setPlatform(e.target.value)}
          />

          <select
            value={tone}
            className="w-full border border-gray-400 bg-gray-50 text-gray-800 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            onChange={(e) => setTone(e.target.value)}
          >
            <option>Persuasive</option>
            <option>Professional</option>
            <option>Casual</option>
            <option>Urgent</option>
          </select>

          {/* Example Button */}
          <button
            onClick={fillExample}
            className="w-full border border-gray-300 py-3 rounded-lg hover:bg-gray-100 transition text-black"
          >
            Try Example
          </button>

          {/* Generate Button */}
          <button
            onClick={generateAd}
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition"
          >
            {loading ? "Generating..." : "Generate Ad Copy"}
          </button>
        </div>

        {/* Result */}
        {result && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 space-y-4">
            <h2 className="font-semibold text-gray-700">Generated Ad Copy</h2>

            <div className="whitespace-pre-wrap text-gray-800">{result}</div>

            <button
              onClick={copyToClipboard}
              className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
            >
              Copy Ad
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
