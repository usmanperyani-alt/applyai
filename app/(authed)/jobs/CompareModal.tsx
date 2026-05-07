"use client";

import { Job } from "@/types";

type Props = {
  jobs: Job[];
  onClose: () => void;
  onTailor?: (job: Job) => void;
  appliedIds?: Set<string>;
};

// Side-by-side job comparison. Opens when user picks 2-3 jobs from the list
// in Compare mode. Read-only, but exposes the same Tailor + Apply CTAs.
export default function CompareModal({ jobs, onClose, onTailor, appliedIds }: Props) {
  if (jobs.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-forest-900/60 backdrop-blur-sm flex items-start justify-center p-6 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-cream-100 rounded-3xl w-full max-w-[1120px] my-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-7 py-5 border-b border-cream-300">
          <div>
            <span className="text-[10px] font-bold tracking-[0.13em] uppercase text-warm-400">
              Side by side
            </span>
            <h2 className="text-[22px] font-bold text-forest-900 -tracking-[0.025em]">
              Compare {jobs.length} {jobs.length === 1 ? "job" : "jobs"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-text-dim hover:text-forest-900 transition-colors"
            aria-label="Close compare"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </header>

        <div className={`grid gap-4 p-6 ${jobs.length === 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"}`}>
          {jobs.map((job) => {
            const applied = appliedIds?.has(job.id);
            const score = Math.max(0, Math.min(100, job.match_score || 0));
            const tone = score >= 85 ? "text-brand-700" : score >= 70 ? "text-amber-darkest" : "text-warm-400";
            const salary =
              job.salary_min && job.salary_max
                ? `$${(job.salary_min / 1000).toFixed(0)}k–${(job.salary_max / 1000).toFixed(0)}k`
                : "Salary not listed";

            return (
              <article key={job.id} className="bg-card-bg rounded-2xl border border-cream-300 p-5 flex flex-col">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-page-bg border border-cream-300 flex items-center justify-center text-[11px] font-semibold text-text-dim">
                    {job.company.slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[12px] text-text-secondary truncate">{job.company}</div>
                    <div className="text-[14px] font-semibold text-forest-900 truncate" title={job.title}>
                      {job.title}
                    </div>
                  </div>
                </div>

                <div className={`text-[44px] font-bold -tracking-[0.025em] leading-none ${tone}`}>
                  {score}%
                </div>
                <div className="text-[11px] text-text-secondary mt-0.5">match for your profile</div>

                <div className="mt-4 space-y-2.5 text-[12px]">
                  <Row label="Salary" value={salary} />
                  <Row label="Location" value={`${job.location || "—"}${job.remote ? " · Remote" : ""}`} />
                  <Row label="Source" value={job.source} />
                </div>

                <div className="mt-4">
                  <div className="text-[10px] font-semibold tracking-[0.13em] text-text-muted uppercase mb-1.5">
                    What they want
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(job.matched_skills || []).slice(0, 6).map((s) => (
                      <span key={s} className="px-2 py-0.5 rounded-full text-[10px] bg-brand-50 text-brand-700 border border-brand-300">
                        {s}
                      </span>
                    ))}
                    {(job.missing_skills || []).slice(0, 3).map((s) => (
                      <span key={s} className="px-2 py-0.5 rounded-full text-[10px] bg-amber-badge-bg text-amber-badge-text border border-amber-bar">
                        + {s}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-auto pt-4">
                  {applied ? (
                    <div className="w-full h-10 flex items-center justify-center rounded-full bg-amber-badge-bg text-amber-badge-text text-[12px] font-semibold">
                      Already applied
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onTailor?.(job)}
                      disabled={!onTailor}
                      className="w-full h-10 rounded-full bg-forest-900 text-white text-[13px] font-semibold hover:bg-forest-800 transition-colors disabled:opacity-50"
                    >
                      Tailor + apply
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px] uppercase tracking-[0.1em] text-text-muted shrink-0">{label}</span>
      <span className="text-[12px] text-forest-900 font-medium text-right truncate" title={value}>
        {value}
      </span>
    </div>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}
