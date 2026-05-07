"use client";

import type { Job, CVContent } from "@/types";
import type { StoredProfile } from "@/lib/store/profile";

type Props = {
  job: Job;
  cv: CVContent | null;
  profile: StoredProfile | null;
  onGenerate: () => void;
  onSkip?: () => void;
  busy?: boolean;
};

// S1 — review master CV + role brief side-by-side, then generate.
// Density-fixed per design: no separate "match analysis" row, the
// strong/partial/gap counts live inline in the role-brief card header.
export default function TailorSetup({ job, cv, profile, onGenerate, onSkip, busy }: Props) {
  const score = Math.max(0, Math.min(100, job.match_score || 0));
  const matched = job.matched_skills?.length || 0;
  const missing = job.missing_skills?.length || 0;
  const partial = Math.max(0, Math.min(matched, 6) - 2); // visual estimate; LLM will refine

  return (
    <div className="flex flex-col min-h-[calc(100vh-72px)]">
      <div className="flex-1 px-8 py-7 max-w-[1200px]">
        {/* Hero */}
        <div className="mb-7">
          <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-brand-soft text-brand-700 text-[10px] font-bold tracking-[0.13em] uppercase mb-3">
            AI Tailoring
          </span>
          <h1 className="text-[40px] font-bold text-forest-900 -tracking-[0.025em] leading-tight">
            {job.title}
          </h1>
          <div className="text-[14px] text-text-secondary mt-1.5">
            <span className="font-medium text-forest-900">{job.company}</span>
            <span className="mx-2">·</span>
            <span>{job.location || "Location not listed"}</span>
            {job.remote && <><span className="mx-2">·</span><span>Remote OK</span></>}
          </div>
        </div>

        {/* Two-column: master CV + role brief */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-4">
          {/* Your master CV */}
          <section className="bg-card-bg rounded-2xl border border-cream-300 p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold tracking-[0.13em] uppercase text-warm-400">
                Your master CV
              </span>
              <a href="/cv" className="text-[11px] font-semibold text-brand-700 hover:text-brand-900">
                Edit →
              </a>
            </div>
            {cv ? (
              <>
                <div className="text-[18px] font-bold text-forest-900 -tracking-[0.015em]">
                  {profile?.full_name || "Your name"}
                </div>
                {profile?.headline && (
                  <div className="text-[12px] text-text-secondary mt-0.5">{profile.headline}</div>
                )}

                {cv.skills && cv.skills.length > 0 && (
                  <>
                    <div className="text-[10px] font-semibold tracking-[0.13em] uppercase text-warm-400 mt-5 mb-2">
                      Top skills
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {cv.skills.slice(0, 6).map((s) => (
                        <span key={s} className="px-2 py-0.5 rounded-full text-[11px] bg-page-bg text-text-dim border border-cream-300">
                          {s}
                        </span>
                      ))}
                    </div>
                  </>
                )}

                {cv.experience && cv.experience.length > 0 && (
                  <>
                    <div className="text-[10px] font-semibold tracking-[0.13em] uppercase text-warm-400 mt-5 mb-2">
                      Latest role
                    </div>
                    <div className="text-[13px] text-forest-900 font-semibold">
                      {cv.experience[0].title} — {cv.experience[0].company}
                    </div>
                    {(cv.experience[0].bullets || []).slice(0, 2).map((b, i) => (
                      <p key={i} className="text-[12px] text-text-dim mt-1.5 leading-relaxed">
                        • {b}
                      </p>
                    ))}
                  </>
                )}
              </>
            ) : (
              <div className="text-[13px] text-text-secondary italic">
                No master CV found. <a href="/cv" className="text-brand-700 underline underline-offset-2">Upload one</a> before tailoring.
              </div>
            )}
          </section>

          {/* What the role looks like */}
          <section className="bg-forest-900 text-white rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold tracking-[0.13em] uppercase text-brand-500">
                What this role looks for
              </span>
              {/* Inline summary chips replace the deleted match analysis row */}
              <div className="flex items-center gap-2 text-[10px] font-semibold tracking-[0.05em]">
                <span className="text-brand-500">{matched} strong</span>
                <span className="text-warm-400">·</span>
                <span className="text-amber-bar">{partial} partial</span>
                <span className="text-warm-400">·</span>
                <span className="text-amber-darkest">{missing} gaps</span>
              </div>
            </div>

            <div className="text-[14px] leading-[1.55] text-white">
              {firstSentence(job.description) ||
                `${job.company} is hiring for ${job.title}. We'll pull the role's key signals from the JD and rewrite your CV to match.`}
            </div>

            {(job.matched_skills?.length || 0) > 0 && (
              <>
                <div className="text-[10px] font-semibold tracking-[0.13em] uppercase text-brand-500 mt-5 mb-2">
                  Keywords we'll emphasize
                </div>
                <div className="flex flex-wrap gap-1">
                  {(job.matched_skills || []).slice(0, 8).map((s) => (
                    <span key={s} className="px-2 py-0.5 rounded-full text-[11px] bg-forest-800 text-white">
                      {s}
                    </span>
                  ))}
                </div>
              </>
            )}

            <div className="mt-5 text-[12px] text-warm-400 leading-relaxed">
              We'll keep every fact from your master CV. Nothing is fabricated. The agent only re-orders, re-emphasizes, and rewords.
            </div>
          </section>
        </div>

        {/* Match strength badge / score */}
        {score > 0 && (
          <div className="mt-5 inline-flex items-center gap-3 px-4 py-2.5 rounded-xl bg-card-bg border border-cream-300">
            <span className={`text-[20px] font-bold ${score >= 85 ? "text-brand-700" : score >= 70 ? "text-amber-darkest" : "text-warm-400"}`}>
              {score}%
            </span>
            <div className="text-[12px] text-text-secondary">
              base match before tailoring · expect a 5–15 pt lift after.
            </div>
          </div>
        )}
      </div>

      {/* Sticky footer */}
      <div className="sticky bottom-0 bg-card-bg border-t border-cream-300 px-8 py-4 flex items-center justify-between">
        <button
          type="button"
          onClick={onSkip}
          disabled={!onSkip}
          className="text-[12px] font-medium text-text-dim hover:text-forest-900 disabled:opacity-50"
        >
          Skip tailoring · apply with master CV
        </button>
        <button
          type="button"
          onClick={onGenerate}
          disabled={busy || !cv}
          className="inline-flex items-center gap-2 h-11 px-6 rounded-full bg-forest-900 text-white text-[13px] font-semibold disabled:opacity-50 hover:bg-forest-800 transition-colors"
        >
          {busy ? "Starting…" : (
            <>
              <SparkleIcon className="w-3.5 h-3.5 text-brand-500" />
              Generate tailored version
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function firstSentence(html?: string | null): string {
  if (!html) return "";
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const m = text.match(/^.+?[.!?](?:\s|$)/);
  return m ? m[0].trim() : text.slice(0, 200);
}

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M9.94 14.06 12 20l2.06-5.94L20 12l-5.94-2.06L12 4l-2.06 5.94L4 12z" />
    </svg>
  );
}
