"use client";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.12),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(99,102,241,0.10),_transparent_24%),linear-gradient(180deg,_#f8fafc_0%,_#eef4ff_100%)] text-slate-900">
      <header className="sticky top-0 z-10 border-b border-slate-200/70 bg-white/72 backdrop-blur-xl">
        <div className="flex h-16 items-center justify-between px-5 sm:px-6 lg:px-8 xl:px-10">
          <div>
            <span className="text-lg font-bold tracking-tight text-slate-900">AI Ad Generator</span>
          </div>
          <a
            href="https://openrouter.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
          >
            Powered by OpenRouter
          </a>
        </div>
      </header>

      <main className="w-full flex-1 px-5 py-5 sm:px-6 lg:px-8 xl:px-10">
        {children}
      </main>
    </div>
  );
}
