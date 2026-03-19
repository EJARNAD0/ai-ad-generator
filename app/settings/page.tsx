"use client";

import { useState } from "react";

export default function SettingsPage() {
  const [workspace, setWorkspace] = useState("My Ad Team");
  const [email, setEmail] = useState("user@example.com");

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Settings</h2>
        <p className="mt-1 text-sm text-slate-500">Manage workspace preferences and notification options.</p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="space-y-1 text-sm text-slate-700">
            Workspace Name
            <input
              value={workspace}
              onChange={(e) => setWorkspace(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </label>
          <label className="space-y-1 text-sm text-slate-700">
            Contact Email
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
            Save Changes
          </button>
          <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
            Reset Defaults
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900">Support</h3>
        <p className="mt-2 text-sm text-slate-600">Need help or want to report an issue? Contact support@adsasst.io.</p>
      </section>
    </div>
  );
}
