"use client";

import Link from "next/link";

type Props = {
  // 0-100
  score: number;
  // For the sub-rows. All 0-100, optional.
  skillsCoverage?: number;
  storyClarity?: number;
  metricsDensity?: number;
};

// Replaces the old CVPanel for the dashboard. Editorial style: ring on the
// left, label + 3 sub-rows on the right. Mirrors design `MeKNp` "CV health".
export default function CVHealthCard({
  score,
  skillsCoverage = 78,
  storyClarity = 72,
  metricsDensity = 66,
}: Props) {
  const tone =
    score >= 85
      ? { label: "Strong overall", color: "#1D9E75", bgRing: "#DCEFE5" }
      : score >= 70
      ? { label: "Solid baseline", color: "#EF9F27", bgRing: "#FAEEDA" }
      : { label: "Needs work", color: "#B85742", bgRing: "#FBE8E2" };

  const dash = (score / 100) * 188; // 2*pi*30 ≈ 188

  return (
    <div className="bg-card-bg border border-cream-300 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[12px] font-semibold text-forest-900">CV health</span>
        <Link
          href="/cv"
          className="text-[10px] font-semibold tracking-[0.13em] uppercase text-brand-700 hover:text-brand-900"
        >
          Edit →
        </Link>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <div className="relative shrink-0 w-[70px] h-[70px]">
          <svg viewBox="0 0 70 70" className="w-full h-full -rotate-90">
            <circle cx="35" cy="35" r="30" fill="none" stroke={tone.bgRing} strokeWidth="6" />
            <circle
              cx="35" cy="35" r="30" fill="none"
              stroke={tone.color}
              strokeWidth="6"
              strokeDasharray={`${dash} 188`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[20px] font-bold text-forest-900 tabular-nums -tracking-[0.025em]">
              {score}
            </span>
          </div>
        </div>
        <div>
          <div className="text-[14px] font-semibold text-forest-900">{tone.label}</div>
          <div className="text-[11px] text-text-secondary mt-0.5">
            Score blends skills + story + metrics.
          </div>
        </div>
      </div>

      <SubRow label="Skills coverage" value={skillsCoverage} />
      <SubRow label="Story clarity" value={storyClarity} />
      <SubRow label="Metrics density" value={metricsDensity} />
    </div>
  );
}

function SubRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="text-[11px] text-text-dim w-[110px]">{label}</span>
      <div className="flex-1 h-1.5 bg-page-bg rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-brand-500"
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
      <span className="text-[11px] font-semibold tabular-nums text-forest-900 w-8 text-right">
        {value}%
      </span>
    </div>
  );
}
