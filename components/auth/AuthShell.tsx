import type { ReactNode } from "react";

type Props = {
  badgeText: string;
  headline: string;
  subline: string;
  footerText: string;
  children: ReactNode;
};

// Two-column editorial layout shared by /auth/forgot, /auth/check-email, /auth/reset.
// Login has its own richer hero (stats, floating mock) so it doesn't use this.
export function AuthShell({ badgeText, headline, subline, footerText, children }: Props) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-cream-100">
      <div className="hidden lg:flex lg:w-[54%] xl:w-[55%] bg-forest-900 text-white relative overflow-hidden">
        <div className="flex flex-col justify-between p-14 xl:p-16 w-full">
          <div className="flex items-center gap-3">
            <span className="w-3.5 h-3.5 rounded-full bg-brand-500" />
            <span className="text-lg font-bold tracking-tight">applyai</span>
          </div>

          <div className="space-y-5 max-w-md">
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-forest-800">
              <SparklesIcon className="w-3 h-3 text-brand-500" />
              <span className="text-[11px] font-bold tracking-[0.13em] text-brand-500">
                {badgeText}
              </span>
            </span>
            <h1 className="text-[60px] xl:text-[68px] leading-[1.02] tracking-[-0.04em] font-bold">
              {headline}
            </h1>
            <p className="text-[17px] leading-[1.5] text-warm-400 -tracking-[0.01em]">
              {subline}
            </p>
          </div>

          <div className="text-ink-700 text-xs font-medium">{footerText}</div>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-10 bg-cream-100 min-h-screen lg:min-h-0">
        <div className="lg:hidden flex items-center gap-2.5 self-start mb-8">
          <span className="w-3 h-3 rounded-full bg-brand-500" />
          <span className="text-[15px] font-bold tracking-tight text-forest-900">applyai</span>
        </div>

        <div className="w-full max-w-[420px] bg-white border border-cream-300 rounded-3xl p-8 lg:p-9 shadow-sm">
          {children}
        </div>
      </div>
    </div>
  );
}

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M9.94 14.06 12 20l2.06-5.94L20 12l-5.94-2.06L12 4l-2.06 5.94L4 12z" />
      <path d="M19 4v3M5.5 18.5l1.5-1.5M19 21v-3" />
    </svg>
  );
}
