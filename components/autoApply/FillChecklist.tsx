"use client";

type Props = {
  filledFields: Record<string, string>;
  unfilledRequired: string[];
  cvAttached: boolean;
  // Inputs the user types in to fill required fields the agent couldn't (e.g.
  // "Why this role?"). Single freeform field — gets concatenated into the
  // cover letter param on submit.
  whyThisRole: string;
  onWhyChange: (v: string) => void;
};

// Right-rail checklist showing what the agent filled vs what still needs the
// user. Per design `M7zG5` (Auto-apply · Review).
export default function FillChecklist({
  filledFields,
  unfilledRequired,
  cvAttached,
  whyThisRole,
  onWhyChange,
}: Props) {
  const filledCount = Object.keys(filledFields).length;
  const requiredCount = unfilledRequired.length;

  return (
    <aside className="lg:sticky lg:top-6 self-start space-y-3">
      <div className="bg-card-bg border border-cream-300 rounded-2xl p-5">
        <div className="text-[10px] font-bold tracking-[0.13em] uppercase text-warm-400 mb-3">
          Fill summary
        </div>

        <Row
          icon={<CheckIcon className="w-3.5 h-3.5 text-brand-500" />}
          label="Filled correctly"
          value={filledCount}
        />
        <Row
          icon={
            requiredCount > 0
              ? <AlertIcon className="w-3.5 h-3.5 text-amber-darkest" />
              : <CheckIcon className="w-3.5 h-3.5 text-brand-500" />
          }
          label="Needs your input"
          value={requiredCount}
          warn={requiredCount > 0}
        />
        <Row
          icon={
            cvAttached
              ? <SparkleIcon className="w-3.5 h-3.5 text-brand-500" />
              : <AlertIcon className="w-3.5 h-3.5 text-amber-darkest" />
          }
          label={cvAttached ? "AI-tailored CV attached" : "Master CV (no tailoring)"}
        />
      </div>

      {requiredCount > 0 && (
        <div className="bg-cream-50 border border-amber-bar rounded-2xl p-5">
          <div className="text-[12px] font-semibold text-amber-darkest mb-1.5">
            ⚠️ Before you submit
          </div>
          <p className="text-[11px] text-amber-darkest leading-relaxed mb-3">
            We couldn't fill {requiredCount} required {requiredCount === 1 ? "field" : "fields"} from your profile alone:
          </p>
          <ul className="text-[11px] text-amber-darkest space-y-1 mb-4">
            {unfilledRequired.slice(0, 5).map((f) => (
              <li key={f} className="flex gap-1.5">
                <span className="text-amber-darkest/60">•</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>

          <label className="block text-[10px] font-semibold tracking-[0.12em] uppercase text-amber-darkest mb-1.5">
            Why this role?
          </label>
          <textarea
            value={whyThisRole}
            onChange={(e) => onWhyChange(e.target.value)}
            rows={4}
            placeholder="A few sentences. Goes in as your cover letter."
            className="w-full px-3 py-2 rounded-lg bg-card-bg border border-cream-300 text-[12px] text-forest-900 placeholder-warm-400 outline-none focus:border-brand-500 resize-y"
          />
        </div>
      )}
    </aside>
  );
}

function Row({ icon, label, value, warn }: { icon: React.ReactNode; label: string; value?: number; warn?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <div className="flex items-center gap-2.5 text-[12px]">
        {icon}
        <span className={warn ? "text-amber-darkest font-medium" : "text-forest-900"}>{label}</span>
      </div>
      {typeof value === "number" && (
        <span className={`text-[14px] font-bold tabular-nums ${warn ? "text-amber-darkest" : "text-forest-900"}`}>
          {value}
        </span>
      )}
    </div>
  );
}

type IconProps = { className?: string };
const CheckIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);
const AlertIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
  </svg>
);
const SparkleIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M9.94 14.06 12 20l2.06-5.94L20 12l-5.94-2.06L12 4l-2.06 5.94L4 12z" />
  </svg>
);
