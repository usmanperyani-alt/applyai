"use client";

type Props = {
  // ISO date of the most recent sweep, or null if never swept.
  lastSweepAt?: string | null;
  // True when an actual scrape is in flight. Drives the pulse animation
  // intensity + label ("Scanning…" vs "Active").
  scanning?: boolean;
  // True if user has paused the agent. Suppresses the active state.
  paused?: boolean;
};

// Ambient "agent vital signs" pill that lives in the sidebar above the user
// menu. Mirrors the design `MeKNp` bottom-left card. Tiny on purpose — it's
// peripheral, not the focus.
export default function AgentStatusCard({ lastSweepAt, scanning, paused }: Props) {
  const status = paused
    ? { dot: "bg-warm-400", label: "AGENT PAUSED", tone: "text-warm-400" }
    : scanning
    ? { dot: "bg-brand-500 animate-pulse", label: "SCANNING NOW", tone: "text-brand-500" }
    : { dot: "bg-brand-500", label: "AGENT ACTIVE", tone: "text-brand-500" };

  return (
    <div className="bg-forest-900 text-white rounded-xl px-3 py-2.5 mb-2">
      <div className="flex items-center gap-1.5">
        <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
        <span className={`text-[9px] font-bold tracking-[0.13em] ${status.tone}`}>
          {status.label}
        </span>
      </div>
      <div className="text-[10px] text-warm-400 mt-1.5 leading-snug">
        {paused ? (
          "Resume from Refine preferences"
        ) : scanning ? (
          "Reading Greenhouse boards…"
        ) : lastSweepAt ? (
          <>Last sweep · <span className="text-cream-100 font-medium">{relativeTime(lastSweepAt)}</span></>
        ) : (
          "No sweeps yet"
        )}
      </div>
    </div>
  );
}

function relativeTime(iso: string): string {
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
