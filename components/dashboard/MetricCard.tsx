import type { ReactNode } from "react";
import { MetricData } from "@/types";

type Props = MetricData & {
  // When true, renders the dark forest "anchor" variant (per design `MeKNp`).
  // Use sparingly — typically only one of the four metric cards.
  dark?: boolean;
  icon?: ReactNode;
};

// Editorial-style metric card. Bigger value, subtler label, optional dark
// variant for the page's "anchor" stat. Optional icon renders in the
// top-right corner of the header row to match the Pencil design.
export default function MetricCard({ label, value, sub, dark, icon }: Props) {
  if (dark) {
    return (
      <div className="bg-forest-900 text-white rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-bold tracking-[0.14em] uppercase text-warm-400">
            {label}
          </div>
          {icon && <span className="text-warm-400">{icon}</span>}
        </div>
        <div className="text-[38px] font-bold -tracking-[0.035em] leading-none mt-3 tabular-nums">
          {value}
        </div>
        {sub && <div className="text-[11px] text-brand-300 mt-2 font-medium">{sub}</div>}
      </div>
    );
  }

  return (
    <div className="bg-card-bg rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-bold tracking-[0.14em] uppercase text-ink-500">
          {label}
        </div>
        {icon && <span className="text-warm-400">{icon}</span>}
      </div>
      <div className="text-[38px] font-bold -tracking-[0.035em] text-forest-900 leading-none mt-3 tabular-nums">
        {value}
      </div>
      {sub && <div className="text-[11px] text-ink-700 mt-2 font-medium">{sub}</div>}
    </div>
  );
}
