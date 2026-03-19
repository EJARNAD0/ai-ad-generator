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

const HISTORY_STORAGE_KEY = "adsHistory";
const HISTORY_LIMIT = 30;

const loadHistory = (): SavedAd[] => {
  if (typeof window === "undefined") return [];

  try {
    const payload = window.localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!payload) return [];
    return JSON.parse(payload);
  } catch {
    return [];
  }
};

const saveHistory = (history: SavedAd[]) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
};

const sortByDateDesc = (a: SavedAd, b: SavedAd) => {
  return new Date(b.date).getTime() - new Date(a.date).getTime();
};

const formatDate = (value: string, withTime = false) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";

  return new Intl.DateTimeFormat(undefined, withTime
    ? {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }
    : {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(date);
};

const createId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `ad-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const getScoreTone = (score: number) => {
  if (score >= 90) {
    return {
      label: "Excellent",
      badge: "bg-emerald-100 text-emerald-700",
      track: "bg-emerald-100",
      bar: "bg-emerald-500",
    };
  }

  if (score >= 75) {
    return {
      label: "Strong",
      badge: "bg-sky-100 text-sky-700",
      track: "bg-sky-100",
      bar: "bg-sky-500",
    };
  }

  return {
    label: "Needs work",
    badge: "bg-amber-100 text-amber-700",
    track: "bg-amber-100",
    bar: "bg-amber-500",
  };
};

export default function HistoryPage() {
  const [history, setHistory] = useState<SavedAd[]>(() => loadHistory());
  const [query, setQuery] = useState("");
  const [platformFilter, setPlatformFilter] = useState("");

  const orderedHistory = useMemo(() => {
    return [...history].sort(sortByDateDesc);
  }, [history]);

  const platformOptions = useMemo(() => {
    return Array.from(new Set(history.map((item) => item.platform)))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  }, [history]);

  const platformBreakdown = useMemo(() => {
    return history.reduce<Record<string, number>>((acc, item) => {
      acc[item.platform] = (acc[item.platform] || 0) + 1;
      return acc;
    }, {});
  }, [history]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.toLowerCase();

    return orderedHistory.filter((item) => {
      const queryMatch =
        item.title.toLowerCase().includes(normalizedQuery) ||
        item.audience.toLowerCase().includes(normalizedQuery);
      const platformMatch = !platformFilter || item.platform === platformFilter;

      return queryMatch && platformMatch;
    });
  }, [orderedHistory, platformFilter, query]);

  const totalAds = history.length;

  const averageScore = useMemo(() => {
    if (!history.length) return 0;
    return Math.round(history.reduce((sum, item) => sum + item.score, 0) / history.length);
  }, [history]);

  const highPerformers = useMemo(() => {
    return history.filter((item) => item.score >= 85).length;
  }, [history]);

  const latestEntry = orderedHistory[0] ?? null;

  const topPlatform = useMemo(() => {
    return Object.entries(platformBreakdown).sort((a, b) => b[1] - a[1])[0] ?? null;
  }, [platformBreakdown]);

  const scoreBands = useMemo(() => {
    return [
      {
        label: "Excellent",
        hint: "90 and above",
        count: history.filter((item) => item.score >= 90).length,
        tone: "bg-emerald-500",
      },
      {
        label: "Strong",
        hint: "75 to 89",
        count: history.filter((item) => item.score >= 75 && item.score < 90).length,
        tone: "bg-sky-500",
      },
      {
        label: "Needs work",
        hint: "Below 75",
        count: history.filter((item) => item.score < 75).length,
        tone: "bg-amber-500",
      },
    ];
  }, [history]);

  const handleDelete = (id: string) => {
    setHistory((current) => {
      const next = current.filter((item) => item.id !== id);
      saveHistory(next);
      return next;
    });
  };

  const handleDuplicate = (item: SavedAd) => {
    setHistory((current) => {
      const duplicate = {
        ...item,
        id: createId(),
        title: `${item.title} Copy`,
        date: new Date().toISOString(),
      };

      const next = [duplicate, ...current].slice(0, HISTORY_LIMIT);
      saveHistory(next);
      return next;
    });
  };

  return (
    <div className="space-y-6 xl:space-y-8">
      <section className="relative overflow-hidden rounded-[32px] bg-slate-950 px-6 py-7 text-white shadow-[0_32px_80px_-40px_rgba(15,23,42,0.82)] sm:px-8 lg:px-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.22),_transparent_32%),radial-gradient(circle_at_85%_20%,_rgba(99,102,241,0.24),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.22),_transparent_26%)]" />

        <div className="relative grid gap-8 xl:grid-cols-[minmax(0,1.55fr)_360px] xl:items-end">
          <div>
            <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-200">
              History Workspace
            </span>

            <h2 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl xl:text-[2.8rem]">
              Bring your saved ads into a cleaner, wider working view.
            </h2>

            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
              Search faster, compare scores at a glance, and keep your best concepts close without wasting the
              room on larger screens.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Saved ads</p>
                <p className="mt-2 text-3xl font-semibold text-white">{totalAds}</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Average score</p>
                <p className="mt-2 text-3xl font-semibold text-white">{averageScore}</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-300">High performers</p>
                <p className="mt-2 text-3xl font-semibold text-white">{highPerformers}</p>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/10 p-5 backdrop-blur-xl">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-300">Latest save</p>

            {latestEntry ? (
              <div className="mt-4 space-y-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-white/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-100">
                      {latestEntry.platform}
                    </span>
                    <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-[11px] font-semibold text-emerald-200">
                      Score {latestEntry.score}
                    </span>
                  </div>

                  <p className="mt-3 text-xl font-semibold tracking-tight text-white">{latestEntry.title}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{latestEntry.audience}</p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-white/8 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Saved on</p>
                    <p className="mt-2 text-sm font-medium text-white">{formatDate(latestEntry.date, true)}</p>
                  </div>

                  <div className="rounded-2xl bg-white/8 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Most active platform</p>
                    <p className="mt-2 text-sm font-medium text-white">
                      {topPlatform ? `${topPlatform[0]} (${topPlatform[1]})` : "No data yet"}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-white/15 bg-white/5 p-5 text-sm leading-6 text-slate-300">
                Your history is empty right now. Generate and save a few ads to start building this workspace.
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.8fr)_360px] 2xl:grid-cols-[minmax(0,1.95fr)_390px]">
        <section className="overflow-hidden rounded-[28px] border border-white/70 bg-white/80 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.3)] backdrop-blur">
          <div className="border-b border-slate-200/80 px-6 py-6 sm:px-7">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-sm font-medium text-sky-700">Ad library</p>
                <h3 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Saved concepts</h3>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  {query || platformFilter
                    ? `Showing ${filtered.length} matching ads from your ${totalAds}-item library.`
                    : "Review older winners, spot reusable angles, and keep the library tidy."}
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:w-full xl:max-w-[440px]">
                <label className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 shadow-inner shadow-white/60">
                  <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Search</span>
                  <input
                    placeholder="Title or audience"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="mt-2 w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                  />
                </label>

                <label className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 shadow-inner shadow-white/60">
                  <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Platform</span>
                  <select
                    value={platformFilter}
                    onChange={(e) => setPlatformFilter(e.target.value)}
                    className="mt-2 w-full bg-transparent text-sm text-slate-900 outline-none"
                  >
                    <option value="">All Platforms</option>
                    {platformOptions.map((platform) => (
                      <option key={platform} value={platform}>
                        {platform}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="px-6 py-14 sm:px-7">
              <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50/80 p-10 text-center">
                <p className="text-lg font-semibold text-slate-900">No matches yet</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Try a different search or clear the platform filter to reveal more saved ads.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="hidden px-6 pt-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 xl:grid xl:grid-cols-[minmax(0,1.7fr)_1fr_140px_160px_156px] sm:px-7">
                <div>Concept</div>
                <div>Audience</div>
                <div>Score</div>
                <div>Saved</div>
                <div className="text-right">Actions</div>
              </div>

              <div className="space-y-4 px-4 py-4 sm:px-5 sm:py-5">
                {filtered.map((item) => {
                  const scoreTone = getScoreTone(item.score);

                  return (
                    <article
                      key={item.id}
                      className="group rounded-[26px] border border-slate-200 bg-white/85 p-4 shadow-sm shadow-slate-900/5 transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg hover:shadow-slate-900/10 sm:p-5"
                    >
                      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_1fr_140px_160px_156px] xl:items-center">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-slate-950 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white">
                              {item.platform}
                            </span>
                            <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${scoreTone.badge}`}>
                              {scoreTone.label}
                            </span>
                          </div>

                          <p className="mt-3 text-base font-semibold tracking-tight text-slate-950 sm:text-lg">
                            {item.title}
                          </p>
                          <p className="mt-2 text-sm leading-6 text-slate-600 xl:hidden">{item.audience}</p>
                        </div>

                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 xl:hidden">
                            Audience
                          </p>
                          <p className="text-sm leading-6 text-slate-700">{item.audience}</p>
                        </div>

                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 xl:hidden">
                            Score
                          </p>
                          <div className="mt-1 flex items-center gap-3 xl:mt-0">
                            <span className="text-xl font-semibold text-slate-950">{item.score}</span>
                            <div className={`h-2 flex-1 rounded-full ${scoreTone.track}`}>
                              <div
                                className={`h-2 rounded-full ${scoreTone.bar}`}
                                style={{ width: `${Math.min(item.score, 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 xl:hidden">
                            Saved
                          </p>
                          <p className="text-sm font-medium text-slate-700">{formatDate(item.date)}</p>
                          <p className="mt-1 text-xs text-slate-500">{formatDate(item.date, true)}</p>
                        </div>

                        <div className="flex flex-wrap gap-2 xl:justify-end">
                          <button
                            onClick={() => handleDuplicate(item)}
                            className="rounded-full bg-slate-950 px-3.5 py-2 text-xs font-semibold text-white shadow-sm shadow-slate-900/10 transition hover:bg-slate-800"
                          >
                            Duplicate
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </section>

        <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
          <section className="rounded-[28px] border border-white/70 bg-white/80 p-6 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.3)] backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-sky-700">At a glance</p>
                <h3 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">Quality mix</h3>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                {totalAds} total
              </span>
            </div>

            <div className="mt-5 space-y-4">
              {scoreBands.map((band) => {
                const percentage = totalAds ? Math.round((band.count / totalAds) * 100) : 0;

                return (
                  <div key={band.label} className="rounded-2xl border border-slate-200 bg-slate-50/90 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{band.label}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400">{band.hint}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-semibold text-slate-950">{band.count}</p>
                        <p className="text-xs text-slate-500">{percentage}%</p>
                      </div>
                    </div>

                    <div className="mt-3 h-2 rounded-full bg-slate-200">
                      <div className={`h-2 rounded-full ${band.tone}`} style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-[28px] border border-white/70 bg-white/80 p-6 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.3)] backdrop-blur">
            <p className="text-sm font-medium text-sky-700">Platform mix</p>
            <h3 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">Where your ideas live</h3>

            {Object.entries(platformBreakdown).length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-5 text-sm text-slate-500">
                Save a few ads first to see your platform breakdown.
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                {Object.entries(platformBreakdown)
                  .sort((a, b) => b[1] - a[1])
                  .map(([platform, count]) => {
                    const percentage = totalAds ? Math.round((count / totalAds) * 100) : 0;

                    return (
                      <div key={platform}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-slate-800">{platform}</span>
                          <span className="text-slate-500">
                            {count} ad{count === 1 ? "" : "s"}
                          </span>
                        </div>
                        <div className="mt-2 h-2 rounded-full bg-slate-200">
                          <div className="h-2 rounded-full bg-slate-950" style={{ width: `${percentage}%` }} />
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </section>

          <section className="rounded-[28px] bg-slate-950 p-6 text-white shadow-[0_24px_60px_-40px_rgba(15,23,42,0.8)]">
            <p className="text-sm font-medium text-sky-300">Workflow notes</p>
            <h3 className="mt-1 text-xl font-semibold tracking-tight">Keep the library useful</h3>

            <div className="mt-5 space-y-4 text-sm leading-6 text-slate-300">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                Duplicate strong ads when you want to iterate on a proven angle without losing the original.
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                Delete weaker ideas once they stop being relevant so your search results stay sharp.
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                Use the score and platform mix together to see which channels are producing your best concepts.
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
