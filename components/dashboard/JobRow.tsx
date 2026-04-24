import { Job } from "@/types";
import Badge from "@/components/ui/Badge";

export type JobRowStatus = "auto-apply" | "review" | "applied" | "skipped";

interface JobRowProps {
  job: Job;
  status?: JobRowStatus;
  onClick?: () => void;
  onApply?: () => void;
}

const statusBadge: Record<JobRowStatus, { variant: "green" | "amber" | "blue" | "gray"; label: string }> = {
  "auto-apply": { variant: "green", label: "Auto-apply" },
  review: { variant: "amber", label: "Review" },
  applied: { variant: "blue", label: "Applied" },
  skipped: { variant: "gray", label: "Skipped" },
};

function getStatus(score: number): JobRowStatus {
  if (score >= 90) return "auto-apply";
  if (score >= 80) return "review";
  return "skipped";
}

export default function JobRow({ job, status, onClick, onApply }: JobRowProps) {
  const resolvedStatus = status || getStatus(job.match_score);
  const badge = statusBadge[resolvedStatus];
  const initials = job.company.slice(0, 2);

  return (
    <div
      className="px-3.5 py-2.5 border-b border-card-border flex items-start gap-2.5 cursor-pointer transition-colors hover:bg-[#f9f9f7] last:border-b-0"
      onClick={onClick}
    >
      <div className="w-8 h-8 rounded-[6px] bg-page-bg border border-card-border flex items-center justify-center text-[11px] font-medium text-text-dim shrink-0">
        {initials}
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium truncate">{job.title}</div>
        <div className="text-[11px] text-text-secondary mt-0.5">
          {job.company} &middot; {job.location}
          {job.salary_max && ` · $${(job.salary_min! / 1000).toFixed(0)}–${(job.salary_max / 1000).toFixed(0)}k`}
        </div>
        <div className="text-[11px] font-medium text-brand-700 mt-[3px]">
          {job.match_score}% match
          {job.remote && " · Remote"}
        </div>
      </div>

      <div className="flex gap-1 items-center shrink-0">
        {resolvedStatus === "auto-apply" && !status && onApply ? (
          <button
            onClick={(e) => { e.stopPropagation(); onApply(); }}
            className="px-2 py-0.5 rounded-full text-[11px] bg-brand-500 text-white hover:bg-brand-700 transition-colors cursor-pointer"
          >
            Auto-apply
          </button>
        ) : (
          <Badge variant={badge.variant}>{badge.label}</Badge>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onClick?.(); }}
          className="w-7 h-7 rounded-lg border border-card-border bg-card-bg flex items-center justify-center hover:bg-page-bg cursor-pointer"
        >
          <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3 h-3">
            <path d="M2 6h8M6 2l4 4-4 4" />
          </svg>
        </button>
      </div>
    </div>
  );
}
