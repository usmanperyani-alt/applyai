"use client";

import { useEffect, useState } from "react";

type SourceState = {
  active: boolean;
  count: number | null;
  label: string;
};

const SOURCES: { key: string; name: string; available: boolean }[] = [
  { key: "greenhouse", name: "Greenhouse", available: true },
  { key: "linkedin", name: "LinkedIn", available: false },
  { key: "indeed", name: "Indeed", available: false },
  { key: "lever", name: "Lever", available: false },
];

// What was the standalone Job Discovery page is now a tab on Jobs.
// Acts as the agent's control center: source health + manual sweep trigger.
export default function SourcesTab() {
  const [sweeping, setSweeping] = useState(false);
  const [lastSweep, setLastSweep] = useState<{ added: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [counts, setCounts] = useState<Record<string, SourceState>>({});

  useEffect(() => {
    // Pull current job counts from /api/jobs to populate per-source state.
    fetch("/api/jobs")
      .then((r) => r.json())
      .then((data: { jobs?: { source: string }[]; total?: number }) => {
        const bySource: Record<string, number> = {};
        for (const j of data.jobs || []) {
          bySource[j.source] = (bySource[j.source] || 0) + 1;
        }
        const next: Record<string, SourceState> = {};
        for (const s of SOURCES) {
          next[s.key] = {
            active: s.available,
            count: bySource[s.key] ?? (s.available ? 0 : null),
            label: s.available ? "Active" : "Coming soon",
          };
        }
        setCounts(next);
      })
      .catch(() => {/* leave counts empty */});
  }, []);

  async function runSweep() {
    setSweeping(true);
    setError(null);
    try {
      const res = await fetch("/api/jobs/discover?source=greenhouse");
      const data = await res.json();
      const before = counts.greenhouse?.count ?? 0;
      const total = data.total ?? before;
      setLastSweep({ added: Math.max(0, total - before), total });
      setCounts((prev) => ({
        ...prev,
        greenhouse: { ...(prev.greenhouse || { active: true, label: "Active", count: 0 }), count: total },
      }));
    } catch {
      setError("Sweep failed. Check that the dev server can reach Greenhouse.");
    } finally {
      setSweeping(false);
    }
  }

  const ghCount = counts.greenhouse?.count ?? 0;

  return (
    <div className="space-y-4">
      {/* Hero card — agent control center */}
      <div className="bg-forest-900 text-white rounded-2xl p-6 flex items-center justify-between gap-6">
        <div>
          <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-forest-800 text-brand-500 text-[10px] font-bold tracking-[0.13em]">
            <span className={`w-1.5 h-1.5 rounded-full bg-brand-500 ${sweeping ? "animate-pulse" : ""}`} />
            {sweeping ? "SWEEP RUNNING" : "AGENT IDLE"}
          </span>
          <div className="mt-3 text-[28px] font-bold -tracking-[0.025em] leading-tight">
            {lastSweep
              ? `${lastSweep.added} new jobs from the last sweep`
              : `${ghCount.toLocaleString()} jobs in your library`}
          </div>
          <div className="text-[13px] text-warm-400 mt-1">
            Greenhouse · default companies · sweeps run on demand for now.
          </div>
        </div>
        <button
          type="button"
          onClick={runSweep}
          disabled={sweeping}
          className="shrink-0 inline-flex items-center gap-2 h-[44px] px-5 rounded-full bg-brand-500 text-forest-900 text-[13px] font-bold disabled:opacity-50 hover:bg-brand-300 transition-colors"
        >
          {sweeping ? "Sweeping…" : "Run sweep now"}
        </button>
      </div>

      {error && (
        <div className="text-[12px] text-red-700 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">
          {error}
        </div>
      )}

      {/* Source cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {SOURCES.map((s) => {
          const state = counts[s.key];
          const isActive = state?.active ?? s.available;
          return (
            <div
              key={s.key}
              className={`bg-card-bg border rounded-xl p-4 ${
                isActive ? "border-brand-300" : "border-card-border opacity-70"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="text-[13px] font-semibold text-forest-900">{s.name}</div>
                <span
                  className={`text-[9px] font-bold tracking-[0.13em] uppercase px-1.5 py-0.5 rounded ${
                    isActive ? "text-brand-700 bg-brand-50" : "text-warm-400 bg-page-bg"
                  }`}
                >
                  {state?.label ?? (isActive ? "Active" : "Coming soon")}
                </span>
              </div>
              <div className="mt-3 text-[24px] font-bold text-forest-900 -tracking-[0.025em]">
                {state?.count != null ? state.count.toLocaleString() : "—"}
              </div>
              <div className="text-[11px] text-text-secondary mt-0.5">
                {isActive ? "jobs scraped" : "scraper not yet wired"}
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent sweeps placeholder — real history table lands when we add a sweep_log table */}
      <div className="bg-card-bg border border-card-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[13px] font-semibold text-forest-900">Recent sweeps</div>
          <span className="text-[10px] tracking-[0.13em] uppercase text-warm-400">Coming soon</span>
        </div>
        <p className="text-[12px] text-text-secondary">
          Sweep history (time, source, jobs added, duration) will live here once we
          add a sweep_log table. Use "Run sweep now" above to manually trigger.
        </p>
      </div>
    </div>
  );
}
