"use client";

import { useEffect, useRef, useState } from "react";
import { finishOnboarding } from "../actions";

const SOURCES = [
  { name: "Stripe", icon: "S" },
  { name: "Figma", icon: "F" },
  { name: "Vercel", icon: "V" },
  { name: "Airbnb", icon: "A" },
  { name: "Ramp", icon: "R" },
];

export default function ScanPage() {
  // Counter animates 0 → ~723 over ~3s; sources tick on like a marquee.
  // Real scan runs in the background; we hand off to /dashboard while it's
  // still going so the user lands somewhere useful immediately.
  const [count, setCount] = useState(0);
  const [activeSource, setActiveSource] = useState(0);
  const [done, setDone] = useState(false);
  const finished = useRef(false);

  useEffect(() => {
    // Kick off the real scan (fire-and-forget; we don't block on it).
    fetch("/api/jobs/discover?source=greenhouse", { method: "GET" }).catch(() => {});

    // UI animation: counter ticks toward a target, sources alternate.
    const target = 723;
    const start = Date.now();
    const id = setInterval(() => {
      const elapsed = Date.now() - start;
      const t = Math.min(1, elapsed / 3500);
      // ease-out for a more natural feel
      const eased = 1 - Math.pow(1 - t, 2);
      setCount(Math.floor(target * eased));
      setActiveSource(Math.floor(elapsed / 600) % SOURCES.length);
      if (t >= 1 && !finished.current) {
        finished.current = true;
        clearInterval(id);
        setDone(true);
        // Mark complete + redirect to dashboard. Background scan keeps running.
        finishOnboarding("/dashboard").catch(() => {
          // NEXT_REDIRECT throws by design; ignore.
        });
      }
    }, 80);
    return () => clearInterval(id);
  }, []);

  const pct = Math.min(100, Math.round((count / 1124) * 100));

  return (
    <div className="min-h-screen bg-forest-900 text-white flex flex-col">
      <div className="flex items-center justify-between px-10 py-6">
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-brand-500" />
          <span className="text-[14px] font-bold tracking-tight">applyai</span>
        </div>
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-forest-800">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
          <span className="text-[11px] font-bold tracking-[0.13em] text-brand-500">
            FIRST SCAN IN PROGRESS
          </span>
        </span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center -mt-10">
        {/* Ring */}
        <div className="relative w-[180px] h-[180px] mb-8">
          <svg viewBox="0 0 180 180" className="w-full h-full -rotate-90">
            <circle cx="90" cy="90" r="78" fill="none" stroke="#1D2F26" strokeWidth="6" />
            <circle
              cx="90"
              cy="90"
              r="78"
              fill="none"
              stroke="#1D9E75"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${(pct / 100) * 490} 490`}
              className="transition-[stroke-dasharray] duration-100"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-[44px] font-bold -tracking-[0.025em] tabular-nums">{count}</div>
            <div className="text-[10px] tracking-[0.15em] text-warm-400 font-semibold">OF 1,124</div>
          </div>
        </div>

        <h1 className="text-[40px] lg:text-[48px] font-bold -tracking-[0.03em] leading-[1.05] max-w-[600px]">
          Scanning your first batch.
        </h1>
        <p className="text-[15px] text-warm-400 mt-3 max-w-[500px] leading-relaxed">
          Reading every job description, scoring against your profile, and queuing top matches for you to review.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
          {SOURCES.map((s, i) => (
            <span
              key={s.name}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] transition-all ${
                i === activeSource
                  ? "bg-brand-500 text-forest-900 font-semibold scale-105"
                  : "bg-forest-800 text-warm-400"
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-forest-950 text-white text-[9px] font-bold flex items-center justify-center">
                {s.icon}
              </span>
              {s.name}
            </span>
          ))}
        </div>

        {done && (
          <div className="mt-8 text-[13px] text-brand-500 font-semibold">
            Done — taking you to the dashboard…
          </div>
        )}
      </div>
    </div>
  );
}
