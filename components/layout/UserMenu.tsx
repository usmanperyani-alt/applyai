"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getBrowserClient } from "@/lib/supabase/browser";

type Props = {
  email: string | null;
  initials: string;
  hasUnread?: boolean;
  supabaseConfigured: boolean;
};

// Popover menu anchored to the user pill at the bottom of the sidebar.
// Opens upward (sidebar-bottom origin). Click-outside closes.
export default function UserMenu({ email, initials, hasUnread = false, supabaseConfigured }: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  async function handleSignOut() {
    if (!supabaseConfigured) return;
    const supabase = getBrowserClient();
    await supabase.auth.signOut();
    setOpen(false);
    router.push("/login");
    router.refresh();
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg transition-colors ${
          open ? "bg-page-bg" : "hover:bg-page-bg"
        }`}
      >
        <div className="relative shrink-0">
          <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-xs font-medium text-brand-900">
            {initials}
          </div>
          {hasUnread && (
            <span
              aria-label="Unread activity"
              className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-brand-500 ring-2 ring-card-bg"
            />
          )}
        </div>
        <div className="min-w-0 flex-1 text-left">
          <div className="text-xs font-medium truncate" title={email || ""}>
            {email || (supabaseConfigured ? "Not signed in" : "Local mode")}
          </div>
          <div className="text-[11px] text-text-secondary">
            {email ? "Signed in" : supabaseConfigured ? "Anonymous" : "No cloud sync"}
          </div>
        </div>
        <ChevronUpIcon className={`w-3 h-3 text-text-muted transition-transform ${open ? "" : "rotate-180"}`} />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-2 bg-card-bg border border-card-border rounded-xl shadow-lg p-1.5 z-50">
          <MenuItem
            label="Settings"
            disabled
            comingSoon
            onClick={() => {}}
            icon={<SettingsIcon className="w-3.5 h-3.5" />}
          />
          <MenuItem
            label="Activity"
            disabled
            comingSoon
            onClick={() => {}}
            icon={<ActivityIcon className="w-3.5 h-3.5" />}
            badge={hasUnread}
          />
          <Link
            href="/analytics"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-text-dim hover:bg-page-bg hover:text-text-primary transition-colors"
          >
            <ChartIcon className="w-3.5 h-3.5" />
            Analytics
          </Link>
          {email && (
            <>
              <div className="my-1 h-px bg-card-border" />
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-text-dim hover:bg-page-bg hover:text-text-primary transition-colors text-left"
              >
                <SignOutIcon className="w-3.5 h-3.5" />
                Sign out
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function MenuItem({
  label,
  icon,
  onClick,
  disabled,
  comingSoon,
  badge,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  comingSoon?: boolean;
  badge?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-lg text-[13px] text-left transition-colors ${
        disabled
          ? "text-text-muted cursor-not-allowed"
          : "text-text-dim hover:bg-page-bg hover:text-text-primary"
      }`}
      title={comingSoon ? "Coming soon" : undefined}
    >
      <span className="flex items-center gap-2.5">
        {icon}
        {label}
        {badge && <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />}
      </span>
      {comingSoon && (
        <span className="text-[9px] font-semibold tracking-wider text-warm-400 uppercase">
          Soon
        </span>
      )}
    </button>
  );
}

type IconProps = { className?: string };
const SettingsIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
    <circle cx="8" cy="8" r="2" />
    <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.5 3.5l1.4 1.4M11.1 11.1l1.4 1.4M3.5 12.5l1.4-1.4M11.1 4.9l1.4-1.4" />
  </svg>
);
const ActivityIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M2 8h2.5l1.5-4 4 8 1.5-4H14" />
  </svg>
);
const ChartIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M2 10l4-4 3 3 5-5" />
  </svg>
);
const SignOutIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M9 12v2H3V2h6v2M11 5l3 3-3 3M14 8H6" />
  </svg>
);
const ChevronUpIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M4 10l4-4 4 4" />
  </svg>
);
