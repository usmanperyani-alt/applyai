import { Job } from "@/types";
import Badge from "@/components/ui/Badge";
import SourceChip from "./SourceChip";

interface JobCardProps {
  job: Job;
}

function scoreBadgeVariant(score: number): "green" | "amber" | "gray" {
  if (score >= 85) return "green";
  if (score >= 70) return "amber";
  return "gray";
}

export default function JobCard({ job }: JobCardProps) {
  const initials = job.company.slice(0, 2);
  const salary =
    job.salary_min && job.salary_max
      ? `$${(job.salary_min / 1000).toFixed(0)}–${(job.salary_max / 1000).toFixed(0)}k`
      : null;

  return (
    <div className="bg-card-bg border border-card-border rounded-xl p-4 hover:shadow-sm transition-shadow cursor-pointer">
      <div className="flex items-start gap-3">
        {/* Logo */}
        <div className="w-10 h-10 rounded-lg bg-page-bg border border-card-border flex items-center justify-center text-xs font-medium text-text-dim shrink-0">
          {initials}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-medium truncate">{job.title}</h3>
              <p className="text-xs text-text-secondary mt-0.5">
                {job.company} · {job.location}
                {salary && ` · ${salary}`}
              </p>
            </div>
            <Badge variant={scoreBadgeVariant(job.match_score)}>
              {job.match_score}% match
            </Badge>
          </div>

          {/* Skills */}
          <div className="flex flex-wrap gap-1 mt-2.5">
            {job.matched_skills.slice(0, 4).map((skill) => (
              <span
                key={skill}
                className="px-2 py-0.5 rounded-full text-[10px] bg-brand-50 text-brand-700 border border-brand-300"
              >
                {skill}
              </span>
            ))}
            {job.missing_skills.slice(0, 2).map((skill) => (
              <span
                key={skill}
                className="px-2 py-0.5 rounded-full text-[10px] bg-amber-badge-bg text-amber-badge-text border border-amber-bar"
              >
                {skill}
              </span>
            ))}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2">
              <SourceChip name={job.source} active />
              {job.remote && (
                <span className="text-[10px] text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full">
                  Remote
                </span>
              )}
            </div>
            <div className="flex gap-1.5">
              <button className="px-3 py-1.5 text-[11px] rounded-lg border border-card-border bg-card-bg hover:bg-page-bg transition-colors cursor-pointer">
                View
              </button>
              <button className="px-3 py-1.5 text-[11px] rounded-lg border border-brand-500 bg-brand-500 text-white hover:bg-brand-700 transition-colors cursor-pointer">
                Quick Apply
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
