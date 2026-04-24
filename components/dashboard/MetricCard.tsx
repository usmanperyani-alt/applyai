import { MetricData } from "@/types";

export default function MetricCard({ label, value, sub }: MetricData) {
  return (
    <div className="bg-card-bg border border-card-border rounded-lg p-3">
      <div className="text-[11px] text-text-secondary mb-1">{label}</div>
      <div className="text-[22px] font-medium">{value}</div>
      <div className="text-[11px] text-brand-500 mt-0.5">{sub}</div>
    </div>
  );
}
