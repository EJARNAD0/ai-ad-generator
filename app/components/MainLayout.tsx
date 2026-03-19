"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";

const navItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Generate", href: "/" },
  { label: "History", href: "/history" },
  { label: "Analytics", href: "/analytics" },
  { label: "Settings", href: "/settings" },
];

const getPageTitle = (path: string) => {
  if (path === "/") return "Generate";
  const active = navItems.find((item) => item.href === path);
  return active?.label ?? "AI Ad Generator";
};

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const pageTitle = useMemo(() => getPageTitle(pathname || "/"), [pathname]);
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.12),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(99,102,241,0.10),_transparent_24%),linear-gradient(180deg,_#f8fafc_0%,_#eef4ff_100%)] text-slate-900">
      <div className="lg:flex lg:min-h-screen">
        {/* Mobile overlay + drawer */}
        <div
          className={`fixed inset-0 z-20 transition-opacity lg:hidden ${
            drawerOpen ? "opacity-70 pointer-events-auto" : "opacity-0 pointer-events-none"
          } bg-black/40`}
          onClick={() => setDrawerOpen(false)}
        />

        <aside
          className={`fixed inset-y-0 left-0 z-30 w-72 transform border-r border-slate-200/80 bg-white/95 p-4 shadow-2xl shadow-slate-900/10 backdrop-blur-xl transition-transform duration-300 lg:static lg:h-screen lg:translate-x-0 lg:flex-shrink-0 ${
            drawerOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="mb-8 flex items-center justify-between">
            <div>
              <p className="text-lg font-bold tracking-tight text-slate-900">AdSaaS</p>
              <p className="text-xs text-slate-500">AI Ad Platform</p>
            </div>
            <button
              className="lg:hidden rounded-md bg-slate-100 px-3 py-1 text-sm font-medium"
              onClick={() => setDrawerOpen(false)}
            >
              Close
            </button>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block rounded-lg px-3 py-2 text-sm font-medium transition ${
                    active
                      ? "bg-indigo-600 text-white"
                      : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                  onClick={() => setDrawerOpen(false)}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-8 rounded-2xl border border-slate-900/5 bg-slate-950 p-4 text-xs text-slate-300 shadow-lg shadow-slate-900/10">
            <p className="font-semibold text-white">Workflow Tip</p>
            <p className="mt-1 leading-5 text-slate-300/90">
              Use History to refine proven concepts, then compare performance patterns in Analytics.
            </p>
          </div>
        </aside>

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 border-b border-slate-200/70 bg-white/72 backdrop-blur-xl">
            <div className="flex h-16 items-center justify-between px-5 sm:px-6 lg:px-8 xl:px-10">
              <div className="flex items-center gap-3">
                <button
                  className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm text-slate-700 shadow-sm hover:bg-slate-100 lg:hidden"
                  onClick={() => setDrawerOpen(true)}
                >
                  Menu
                </button>
                <h1 className="text-xl font-bold text-slate-900">{pageTitle}</h1>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden lg:flex items-center rounded-full border border-slate-200/80 bg-white/75 px-3 py-1.5 text-sm text-slate-600 shadow-sm shadow-slate-900/5">
                  <span className="mr-2 text-slate-400">🔍</span>
                  <span>Search…</span>
                </div>
                <button className="hidden sm:inline-flex rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-slate-900/15 transition hover:bg-slate-800">
                  New Workspace
                </button>
                <div className="h-8 w-8 rounded-full bg-indigo-500 text-center leading-8 text-sm font-semibold text-white">JD</div>
              </div>
            </div>
          </header>

          <main className="w-full flex-1 px-5 py-8 sm:px-6 lg:px-8 xl:px-10">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
