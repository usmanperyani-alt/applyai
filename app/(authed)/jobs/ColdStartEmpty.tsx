"use client";

import { useState } from "react";

type Props = {
  onSweep: () => Promise<void> | void;
};

// "No sweeps yet" state for /jobs — distinct from filter-empty.
// Shown when total jobs in the DB is zero AND user has a CV.
// Mirrors design `kZp9J` (Empty Jobs · No sweeps yet).
export default function ColdStartEmpty({ onSweep }: Props) {
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    setBusy(true);
    try {
      await onSweep();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center p-10">
      <div className="bg-card-bg border border-cream-300 rounded-3xl px-12 py-14 max-w-[520px] text-center shadow-sm">
        <div className="w-14 h-14 rounded-full bg-cream-100 mx-auto flex items-center justify-center mb-5">
          <RadarIcon className="w-6 h-6 text-warm-400" />
        </div>
        <h2 className="text-[24px] font-bold text-forest-900 -tracking-[0.025em]">
          No jobs scraped yet.
        </h2>
        <p className="text-[13px] text-ink-700 mt-2 leading-relaxed max-w-[400px] mx-auto">
          The agent runs your first sweep automatically. Usually takes about 30 seconds — or kick it off now.
        </p>
        <button
          type="button"
          onClick={handleClick}
          disabled={busy}
          className="inline-flex items-center gap-2.5 h-[48px] px-6 rounded-full bg-forest-900 text-white text-[14px] font-semibold hover:bg-forest-800 disabled:opacity-50 transition-colors mt-6"
        >
          <PlayIcon className="w-4 h-4" />
          {busy ? "Sweeping…" : "Run first sweep"}
        </button>
      </div>
    </div>
  );
}

type IconProps = { className?: string };
const RadarIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
    <path d="M12 12 L18 6" />
  </svg>
);
const PlayIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M6 4l14 8-14 8z" />
  </svg>
);
