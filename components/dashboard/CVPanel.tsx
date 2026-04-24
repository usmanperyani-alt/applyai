import Link from "next/link";
import ProgressBar from "@/components/ui/ProgressBar";
import Badge from "@/components/ui/Badge";

interface CVPanelProps {
  matchedSkills: string[];
  missingSkills: string[];
}

export default function CVPanel({ matchedSkills, missingSkills }: CVPanelProps) {
  const hasSkills = matchedSkills.length > 0 || missingSkills.length > 0;

  return (
    <div className="bg-card-bg border border-card-border rounded-xl overflow-hidden">
      <div className="px-3.5 py-3 border-b border-card-border flex items-center justify-between">
        <span className="text-[13px] font-medium">CV</span>
        {hasSkills ? (
          <Badge variant="green">Ready</Badge>
        ) : (
          <Badge variant="gray">Not tailored</Badge>
        )}
      </div>
      <div className="p-3.5">
        {hasSkills ? (
          <>
            <div className="flex items-center gap-2.5 mb-3">
              <svg width="48" height="48" viewBox="0 0 48 48">
                <circle cx="24" cy="24" r="20" fill="none" stroke="#f4f4f0" strokeWidth="4" />
                <circle
                  cx="24" cy="24" r="20" fill="none" stroke="#1D9E75" strokeWidth="4"
                  strokeDasharray="125.6" strokeDashoffset="15" strokeLinecap="round"
                  transform="rotate(-90 24 24)"
                />
                <text x="24" y="29" textAnchor="middle" fontSize="13" fontWeight="500" fill="#0F6E56">
                  88%
                </text>
              </svg>
              <div>
                <div className="text-base font-medium">Strong match</div>
                <div className="text-[11px] text-text-secondary">AI tailored for this role</div>
              </div>
            </div>

            <div className="text-[11px] text-text-secondary mb-[5px]">Matched skills</div>
            <div className="flex flex-wrap gap-[5px] mb-2.5">
              {matchedSkills.map((skill) => (
                <span key={skill} className="px-2 py-[3px] rounded-full text-[11px] border border-brand-300 bg-brand-50 text-brand-700">
                  {skill}
                </span>
              ))}
              {missingSkills.map((skill) => (
                <span key={skill} className="px-2 py-[3px] rounded-full text-[11px] border border-amber-bar bg-amber-badge-bg text-amber-badge-text">
                  {skill}
                </span>
              ))}
            </div>

            <div className="flex justify-between text-[11px] text-text-secondary mb-[3px]">
              <span>Experience emphasis</span><span>Adjusted</span>
            </div>
            <div className="mb-2"><ProgressBar value={88} /></div>

            <div className="flex justify-between text-[11px] text-text-secondary mb-[3px]">
              <span>Keywords coverage</span><span>76%</span>
            </div>
            <div className="mb-2"><ProgressBar value={76} /></div>
          </>
        ) : (
          <div className="py-6 text-center">
            <div className="text-[13px] text-text-secondary mb-1">No CV tailored yet</div>
            <p className="text-[11px] text-text-secondary">
              Select a job to tailor your CV with AI
            </p>
          </div>
        )}

        <Link
          href="/cv"
          className="block w-full mt-2 py-[7px] px-3.5 rounded-lg text-xs text-center border border-card-border bg-card-bg text-text-primary hover:bg-page-bg transition-colors cursor-pointer"
        >
          {hasSkills ? "View tailored CV" : "Go to CV Editor"}
        </Link>
      </div>
    </div>
  );
}
