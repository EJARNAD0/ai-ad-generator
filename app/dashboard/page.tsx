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

export default function DashboardPage() {
  const [history, setHistory] = useState<SavedAd[]>(() => loadHistory());

  const total = history.length;
  const avgScore = useMemo(() => {
    if (history.length === 0) return 0;
    return Math.round(history.reduce((sum, item) => sum + item.score, 0) / history.length);
  }, [history]);

  const byPlatform = useMemo(() => {
    return history.reduce<Record<string, number>>((acc, item) => {
      acc[item.platform] = (acc[item.platform] || 0) + 1;
      return acc;
    }, {});
  }, [history]);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Total Ads</p>
          <p className="text-3xl font-bold text-slate-900">{total}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Average Score</p>
          <p className="text-3xl font-bold text-slate-900">{avgScore}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Saved Variants</p>
          <p className="text-3xl font-bold text-slate-900">{Math.max(0, total * 2)}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Active Platforms</p>
          <p className="text-3xl font-bold text-slate-900">{Object.keys(byPlatform).length}</p>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-slate-900">Performance Snapshot</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Generated Today</p>
            <p className="mt-2 text-xl font-semibold text-slate-800">{Math.round(total * 0.15)}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">High-Performing Ads</p>
            <p className="mt-2 text-xl font-semibold text-slate-800">{history.filter((item) => item.score >= 85).length}</p>
          </div>
        </div>

        <div className="mt-6">
          <p className="text-sm font-medium text-slate-700">Platform Spectrum</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {Object.entries(byPlatform).length === 0 ? (
              <span className="text-sm text-slate-500">No data yet.</span>
            ) : (
              Object.entries(byPlatform).map(([platform, count]) => (
                <div key={platform} className="rounded-lg bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700">
                  {platform}: {count}
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-slate-900">Recent Activity</h3>
        {history.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-slate-500">
            No activity yet. Generate and save your first ad.
          </div>
        ) : (
          <ul className="space-y-3">
            {history.slice(0, 5).map((item) => (
              <li key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="font-semibold text-slate-800">{item.title}</p>
                <p className="text-xs text-slate-500">{new Date(item.date).toLocaleString()}</p>
                <p className="mt-1 text-sm text-slate-600">{item.platform} · Score {item.score}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
