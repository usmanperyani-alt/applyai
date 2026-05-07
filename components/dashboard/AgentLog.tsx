"use client";

export type AgentLogEntry = {
  id: string;
  kind: "scrape" | "tailor" | "submit" | "interview" | "match";
  text: string;
  meta?: string;
  // ISO timestamp
  at: string;
};

type Props = {
  entries: AgentLogEntry[];
  // When true, dim the whole panel — used while paused.
  paused?: boolean;
};

// Right-rail "what the agent did recently" feed. Live-ticker style.
// Real entries should come from a future agent_log table; for now the
// dashboard synthesizes plausible entries from job + applied data.
export default function AgentLog({ entries, paused }: Props) {
  return (
    <div className={`bg-card-bg border border-cream-300 rounded-2xl overflow-hidden ${paused ? "opacity-60" : ""}`}>
      <div className="px-4 py-3 border-b border-cream-300 flex items-center justify-between">
        <span className="text-[12px] font-semibold text-forest-900">Agent log</span>
        <span className="inline-flex items-center gap-1 text-[9px] font-bold tracking-[0.13em] uppercase text-brand-700">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
          {paused ? "Paused" : "Live"}
        </span>
      </div>
      {entries.length === 0 ? (
        <div className="px-4 py-6 text-center">
          <p className="text-[11px] text-text-secondary leading-relaxed">
            Quiet for now. The agent will start logging once it scans, tailors, or submits anything.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-cream-100">
          {entries.slice(0, 6).map((e) => (
            <li key={e.id} className="px-4 py-2.5 flex items-start gap-2.5">
              <Glyph kind={e.kind} />
              <div className="flex-1 min-w-0">
                <div className="text-[12px] text-forest-900 leading-snug">{e.text}</div>
                <div className="text-[10px] text-text-secondary mt-0.5">
                  {relative(e.at)}{e.meta ? ` · ${e.meta}` : ""}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Glyph({ kind }: { kind: AgentLogEntry["kind"] }) {
  const styles: Record<AgentLogEntry["kind"], { bg: string; fg: string; symbol: React.ReactNode }> = {
    scrape: { bg: "bg-brand-soft", fg: "text-brand-700", symbol: <RadarIcon className="w-3 h-3" /> },
    tailor: { bg: "bg-cream-50", fg: "text-amber-darkest", symbol: <SparkleIcon className="w-3 h-3" /> },
    submit: { bg: "bg-brand-50", fg: "text-brand-700", symbol: <SendIcon className="w-3 h-3" /> },
    interview: { bg: "bg-amber-badge-bg", fg: "text-amber-badge-text", symbol: <CalendarIcon className="w-3 h-3" /> },
    match: { bg: "bg-blue-badge-bg", fg: "text-blue-badge-text", symbol: <SearchIcon className="w-3 h-3" /> },
  };
  const s = styles[kind];
  return (
    <span className={`shrink-0 mt-0.5 w-5 h-5 rounded-full flex items-center justify-center ${s.bg} ${s.fg}`}>
      {s.symbol}
    </span>
  );
}

function relative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

type IconProps = { className?: string };
const RadarIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="5" /><path d="M12 12 L18 6" />
  </svg>
);
const SparkleIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M9.94 14.06 12 20l2.06-5.94L20 12l-5.94-2.06L12 4l-2.06 5.94L4 12z" />
  </svg>
);
const SendIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m22 2-7 20-4-9-9-4z" /><path d="M22 2 11 13" />
  </svg>
);
const CalendarIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);
const SearchIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
  </svg>
);
