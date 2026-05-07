import { Job } from "@/types";

export type JobRowStatus = "auto-apply" | "review" | "applied" | "skipped";

interface JobRowProps {
  job: Job;
  status?: JobRowStatus;
  onClick?: () => void;
  onTailor?: () => void;
  onApply?: () => void;
  emphasized?: boolean;
}

function scoreColor(score: number) {
  if (score >= 90) return "text-brand-700";
  if (score >= 80) return "text-brand-700";
  if (score >= 70) return "text-amber-darkest";
  return "text-warm-400";
}

function formatSalary(min: number | null | undefined, max: number | null | undefined) {
  if (!min || !max) return null;
  return `$${(min / 1000).toFixed(0)}k–$${(max / 1000).toFixed(0)}k`;
}

export default function JobRow({ job, status, onClick, onTailor, onApply, emphasized }: JobRowProps) {
  const initial = job.company.charAt(0).toUpperCase();
  const hasScore = typeof job.match_score === "number" && job.match_score > 0;
  const score = hasScore ? job.match_score : null;
  const salary = formatSalary(job.salary_min, job.salary_max);
  const isApplied = status === "applied";

  return (
    <div
      className="px-6 py-4 flex items-center gap-3.5 cursor-pointer transition-colors hover:bg-cream-100/60 border-t border-cream-100 first:border-t-0"
      onClick={onClick}
    >
      <div
        className={`w-[42px] h-[42px] rounded-[10px] flex items-center justify-center text-[18px] font-bold shrink-0 ${
          emphasized
            ? "bg-forest-900 text-brand-500"
            : "bg-cream-100 text-ink-700"
        }`}
      >
        {initial}
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-semibold text-forest-900 -tracking-[0.01em] truncate">
          {job.title}
        </div>
        <div className="text-[12px] text-ink-500 mt-0.5 truncate">
          {job.company}
          {job.remote ? " · Remote" : job.location ? ` · ${job.location}` : ""}
          {salary ? ` · ${salary}` : ""}
        </div>
      </div>

      {score !== null && (
        <div className="flex flex-col items-end shrink-0">
          <span className={`text-[22px] font-bold leading-none -tracking-[0.025em] tabular-nums ${scoreColor(score)}`}>
            {score}
          </span>
          <span className={`text-[9px] font-semibold tracking-[0.13em] mt-0.5 ${scoreColor(score)}`}>
            % MATCH
          </span>
        </div>
      )}

      <button
        onClick={(e) => {
          e.stopPropagation();
          if (isApplied) return;
          if (onTailor) onTailor();
          else if (onApply) onApply();
        }}
        disabled={isApplied}
        className={`shrink-0 h-[34px] px-4 inline-flex items-center gap-1.5 rounded-full text-[12px] font-semibold transition-colors ${
          isApplied
            ? "bg-cream-100 text-ink-500 cursor-default"
            : emphasized
            ? "bg-forest-900 text-white hover:bg-forest-800 cursor-pointer"
            : "bg-card-bg text-forest-900 border border-cream-300 hover:bg-cream-100 cursor-pointer"
        }`}
      >
        {!isApplied && (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`w-3 h-3 ${emphasized ? "text-brand-500" : "text-brand-700"}`}>
            <path d="M12 3l1.9 5.6a2 2 0 0 0 1.5 1.5L21 12l-5.6 1.9a2 2 0 0 0-1.5 1.5L12 21l-1.9-5.6a2 2 0 0 0-1.5-1.5L3 12l5.6-1.9a2 2 0 0 0 1.5-1.5L12 3z" />
          </svg>
        )}
        {isApplied ? "Applied ✓" : "Tailor"}
      </button>
    </div>
  );
}
