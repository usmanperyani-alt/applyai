import type { ReactNode } from "react";

interface TopBarProps {
  title: string;
  subtitle?: string;
  // Optional agent-voiced greeting line above the title (e.g. "Good evening, Muhammad").
  greeting?: string;
  actions?: ReactNode;
}

// Backward-compatible: existing callers (Jobs, Applications, etc.) pass title/subtitle/actions.
// New optional `greeting` prop renders an editorial line above the title — used by Dashboard.
export default function TopBar({ title, subtitle, greeting, actions }: TopBarProps) {
  return (
    <div className="bg-card-bg border-b border-card-border px-5 py-3 flex items-center justify-between shrink-0 gap-4">
      <div className="min-w-0">
        {greeting && (
          <div className="text-[11px] font-medium text-text-secondary -mb-0.5">{greeting}</div>
        )}
        <div className={greeting ? "text-[22px] font-bold text-forest-900 -tracking-[0.025em] leading-tight" : "text-[15px] font-medium"}>
          {title}
        </div>
        {subtitle && !greeting && (
          <div className="text-xs text-text-secondary mt-px">{subtitle}</div>
        )}
        {subtitle && greeting && (
          <div className="text-[11px] text-text-secondary">{subtitle}</div>
        )}
      </div>
      {actions && <div className="flex gap-2 items-center shrink-0">{actions}</div>}
    </div>
  );
}
