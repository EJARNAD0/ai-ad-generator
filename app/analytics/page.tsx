"use client";

import { useMemo, useState } from "react";

type SavedAd = {
  id: string;
  title: string;
  platform: string;
  audience: string;
  score: number;
  date: string;
};

const loadHistory = (): SavedAd[] => {
  if (typeof window === "undefined") return [];
  try {
    const payload = window.localStorage.getItem("adsHistory");
    if (!payload) return [];
    return JSON.parse(payload);
  } catch {
    return [];
  }
};

export default function AnalyticsPage() {
  const [history, setHistory] = useState<SavedAd[]>(() => loadHistory());

  const scoreBuckets = useMemo(() => {
    const buckets = ["60-69", "70-79", "80-89", "90+"];
    return buckets.map((bucket) => {
      const [min, max] = bucket === "90+" ? [90, 100] : bucket.split("-").map(Number);
      return {
        bucket,
        count: history.filter((item) => item.score >= min && item.score <= max).length,
      };
    });
  }, [history]);

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Ad Performance</h2>
        {!history.length ? (
          <div className="mt-4 rounded-lg border border-dashed border-slate-300 p-6 text-center text-slate-500">
            No analytics data available yet. Save generated ads in History first.
          </div>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <article className="rounded-lg bg-slate-50 p-4">
              <h3 className="text-sm font-medium text-slate-500">Score Distribution</h3>
              <div className="mt-3 space-y-2">
                {scoreBuckets.map(({ bucket, count }) => {
                  const total = history.length || 1;
                  const width = `${Math.round((count / total) * 100)}%`;
                  return (
                    <div key={bucket} className="space-y-1">
                      <div className="flex justify-between text-xs text-slate-600">
                        <span>{bucket}</span>
                        <span>{count}</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-200">
                        <div className="h-full rounded-full bg-indigo-500" style={{ width }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>

            <article className="rounded-lg bg-slate-50 p-4">
              <h3 className="text-sm font-medium text-slate-500">Average Score</h3>
              <p className="mt-2 text-3xl font-bold text-slate-800">
                {Math.round(history.reduce((sum, item) => sum + item.score, 0) / history.length)}
              </p>
            </article>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Channel Breakdown</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(history.reduce<Record<string, number>>((acc, item) => {
            acc[item.platform] = (acc[item.platform] || 0) + 1;
            return acc;
          }, {})).map(([platform, value]) => (
            <div key={platform} className="rounded-lg bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-600">{platform}</p>
              <p className="mt-1 text-2xl font-semibold text-slate-800">{value}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
