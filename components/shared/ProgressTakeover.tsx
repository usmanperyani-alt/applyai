"use client";

import type { ReactNode } from "react";

export type ProgressStepStatus = "done" | "active" | "pending";

export type ProgressStep = {
  label: string;
  status: ProgressStepStatus;
  // Optional right-side text (e.g. "00:42" timing or "Skipped" reason).
  meta?: string;
};

type Props = {
  title: string;
  subtitle?: string;
  steps: ProgressStep[];
  // 0-100. Drives the ring fill. Optional (omit to hide ring).
  progressPct?: number;
  // Optional cancel button at the bottom.
  cancelLabel?: string;
  onCancel?: () => void;
  // Optional eyebrow shown above the title (e.g. "AI TAILORING").
  eyebrow?: string;
  footer?: ReactNode;
};

// Dark forest takeover used by long-running operations: tailor flow's
// "Generating" step and auto-apply's "Submitting" step. Identical visual
// treatment so users learn to recognize "agent is doing real work, wait".
export default function ProgressTakeover({
  title,
  subtitle,
  steps,
  progressPct,
  cancelLabel = "Cancel",
  onCancel,
  eyebrow,
  footer,
}: Props) {
  const showRing = typeof progressPct === "number";
  const pct = Math.max(0, Math.min(100, progressPct ?? 0));

  return (
    <div className="min-h-screen bg-cream-100 flex flex-col">
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-[520px] flex flex-col items-center">
          {/* Dark hero card */}
          <div className="w-full bg-forest-900 text-white rounded-3xl p-9 flex flex-col items-center text-center">
            {showRing && (
              <div className="relative w-[120px] h-[120px] mb-6">
                <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                  <circle cx="60" cy="60" r="52" fill="none" stroke="#1D2F26" strokeWidth="5" />
                  <circle
                    cx="60"
                    cy="60"
                    r="52"
                    fill="none"
                    stroke="#1D9E75"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeDasharray={`${(pct / 100) * 327} 327`}
                    className="transition-[stroke-dasharray] duration-200"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <SparkleIcon className="w-7 h-7 text-brand-500" />
                </div>
              </div>
            )}
            {eyebrow && (
              <span className="text-[10px] font-bold tracking-[0.13em] text-brand-500 mb-2">
                {eyebrow}
              </span>
            )}
            <h1 className="text-[28px] lg:text-[32px] font-bold -tracking-[0.025em] leading-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-[14px] text-warm-400 mt-2 max-w-[400px] leading-relaxed">
                {subtitle}
              </p>
            )}
            {showRing && (
              <div className="text-[11px] text-warm-400 mt-4 tabular-nums">
                {pct}% complete
              </div>
            )}
          </div>

          {/* Step checklist */}
          <div className="w-full mt-4 bg-card-bg border border-cream-300 rounded-2xl p-5 space-y-2">
            {steps.map((s, i) => (
              <StepRow key={i} step={s} />
            ))}
          </div>

          {/* Optional footer slot or cancel button */}
          {footer ? (
            <div className="mt-5">{footer}</div>
          ) : onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="mt-5 inline-flex items-center gap-2 h-10 px-5 rounded-full border border-cream-300 bg-card-bg text-[13px] font-medium text-text-dim hover:bg-cream-100 transition-colors"
            >
              <CloseIcon className="w-3.5 h-3.5" />
              {cancelLabel}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function StepRow({ step }: { step: ProgressStep }) {
  const tone =
    step.status === "done"
      ? "text-forest-900"
      : step.status === "active"
      ? "text-brand-700 font-medium"
      : "text-warm-400";

  return (
    <div className="flex items-center justify-between gap-3 text-[12px]">
      <div className="flex items-center gap-2.5">
        {step.status === "done" ? (
          <CheckCircleIcon className="w-4 h-4 text-brand-500 shrink-0" />
        ) : step.status === "active" ? (
          <span className="w-4 h-4 shrink-0 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
        ) : (
          <span className="w-4 h-4 shrink-0 rounded-full border border-cream-300" />
        )}
        <span className={tone}>{step.label}</span>
      </div>
      {step.meta && (
        <span className="text-[10px] tabular-nums text-text-secondary">{step.meta}</span>
      )}
    </div>
  );
}

type IconProps = { className?: string };
const SparkleIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M9.94 14.06 12 20l2.06-5.94L20 12l-5.94-2.06L12 4l-2.06 5.94L4 12z" />
  </svg>
);
const CheckCircleIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);
const CloseIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);
