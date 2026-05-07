"use client";

import Link from "next/link";
import type { Job, CVContent } from "@/types";
import type { StoredProfile } from "@/lib/store/profile";

type Props = {
  job: Job;
  cv: CVContent;
  profile: StoredProfile | null;
  cvId: string | null;
  pdfUrl: string | null;
  onApply: () => void;
};

// S4 — success. Apply primary, Download ghost (per design fix).
// Auto-redirect to auto-apply happens in the page after a short pause,
// but we expose Apply as the primary CTA so users can also click through.
export default function TailorSaved({ job, cv, profile, cvId, pdfUrl, onApply }: Props) {
  return (
    <div className="px-8 py-12 max-w-[1100px] grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-10 items-start">
      {/* Left — success copy + actions */}
      <div>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-full bg-brand-500 flex items-center justify-center">
            <CheckIcon className="w-5 h-5 text-white" />
          </div>
          <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-brand-soft text-brand-700 text-[10px] font-bold tracking-[0.13em] uppercase">
            Saved to your library
          </span>
        </div>

        <h1 className="text-[40px] lg:text-[44px] font-bold text-forest-900 -tracking-[0.025em] leading-[1.05]">
          Tailored CV saved.
        </h1>
        <p className="text-[15px] text-text-secondary mt-3 max-w-[460px] leading-relaxed">
          Linked to <span className="font-medium text-forest-900">{job.company} — {job.title}</span>. We'll use this exact version when you apply, and you can pull it back up any time from your library.
        </p>

        {pdfUrl && (
          <div className="text-[12px] text-brand-700 font-medium mt-3 flex items-center gap-2">
            <FileIcon className="w-3.5 h-3.5" />
            PDF · ready · saved {new Date().toLocaleDateString()}
          </div>
        )}

        <div className="mt-7 flex flex-col gap-2 max-w-[360px]">
          <button
            type="button"
            onClick={onApply}
            className="inline-flex items-center justify-center gap-2 h-[54px] rounded-full bg-forest-900 text-white text-[15px] font-semibold hover:bg-forest-800 transition-colors"
          >
            Apply with this CV
            <ArrowRightIcon className="w-4 h-4" />
          </button>

          {pdfUrl && cvId && (
            <a
              href={`/api/cv/${cvId}/pdf?download=1`}
              className="inline-flex items-center justify-center gap-2 h-10 rounded-full text-[12px] text-text-dim hover:text-forest-900 transition-colors"
            >
              <DownloadIcon className="w-3.5 h-3.5" />
              Download PDF
            </a>
          )}

          <Link
            href="/applications"
            className="inline-flex items-center justify-center gap-2 h-10 rounded-full text-[12px] text-text-dim hover:text-forest-900 transition-colors"
          >
            View in your library →
          </Link>
        </div>
      </div>

      {/* Right — PDF preview-ish card */}
      <aside className="bg-card-bg border border-cream-300 rounded-3xl p-7 self-start">
        <div className="text-[18px] font-bold text-forest-900 -tracking-[0.015em]">
          {profile?.full_name || "Your name"}
        </div>
        {profile?.headline && (
          <div className="text-[12px] text-brand-700 font-medium mt-0.5">{profile.headline}</div>
        )}
        {profile?.email && (
          <div className="text-[10px] text-warm-400 mt-1">
            {profile.email}{profile.location ? ` · ${profile.location}` : ""}
          </div>
        )}

        <div className="h-px bg-cream-300 my-4" />

        {cv.summary && (
          <>
            <div className="text-[9px] font-bold tracking-[0.18em] uppercase text-brand-700">
              Summary
            </div>
            <p className="text-[11px] text-text-secondary mt-1 leading-relaxed line-clamp-3">
              {cv.summary}
            </p>
          </>
        )}

        {cv.experience && cv.experience.length > 0 && (
          <>
            <div className="text-[9px] font-bold tracking-[0.18em] uppercase text-brand-700 mt-4">
              Experience
            </div>
            <div className="text-[11px] font-semibold text-forest-900 mt-1">
              {cv.experience[0].title} — {cv.experience[0].company}
            </div>
            {(cv.experience[0].bullets || []).slice(0, 2).map((b, i) => (
              <p key={i} className="text-[10px] text-text-secondary mt-0.5 leading-relaxed">
                • {b}
              </p>
            ))}
          </>
        )}

        {cv.skills && cv.skills.length > 0 && (
          <>
            <div className="text-[9px] font-bold tracking-[0.18em] uppercase text-brand-700 mt-4">
              Skills
            </div>
            <p className="text-[10px] text-text-secondary mt-1 leading-relaxed">
              {cv.skills.slice(0, 6).join(" · ")}
            </p>
          </>
        )}
      </aside>
    </div>
  );
}

type IconProps = { className?: string };
const CheckIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);
const ArrowRightIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);
const FileIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
  </svg>
);
const DownloadIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
  </svg>
);
