"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getBrowserClient } from "@/lib/supabase/browser";
import UserMenu from "./UserMenu";
import AgentStatusCard from "@/components/dashboard/AgentStatusCard";

// 5 main-nav items (down from 6 after Phase C). Analytics moved to user menu.
// Settings + Activity will join via UserMenu in Phases G + I.
// Job Discovery + Compare + Billing fold into Jobs / Settings in later phases.
const navSections = [
  {
    label: "Overview",
    items: [
      { name: "Dashboard", href: "/dashboard", icon: DashboardIcon },
      { name: "Jobs", href: "/jobs", icon: SearchIcon },
      { name: "Applications", href: "/applications", icon: ListIcon },
    ],
  },
  {
    label: "Tools",
    items: [
      { name: "CV Editor", href: "/cv", icon: DocIcon },
      { name: "Preferences", href: "/preferences", icon: SettingsIcon },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [email, setEmail] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const supabaseConfigured =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  useEffect(() => {
    if (!supabaseConfigured) return;
    const supabase = getBrowserClient();
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, [supabaseConfigured]);

  // Read pause state from localStorage. Dashboard writes to this same key
  // on toggle and dispatches "agentPausedChange" so we live-update.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sync = () => setPaused(localStorage.getItem("agentPaused") === "true");
    sync();
    window.addEventListener("agentPausedChange", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("agentPausedChange", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const initials = email
    ? email.split("@")[0].slice(0, 2).toUpperCase()
    : "··";

  // hasUnread = false until Activity ships (Phase G). UserMenu accepts the prop now.
  return (
    <aside className="w-[200px] bg-card-bg border-r border-card-border flex flex-col shrink-0"
      style={{ padding: "16px 0" }}>
      <div className="px-4 pb-5 flex items-center gap-2">
        <div className="w-6 h-6 bg-brand-500 rounded-[6px]"></div>
      </div>

      {navSections.map((section) => (
        <div key={section.label}>
          <div className="text-[10px] tracking-[0.08em] text-text-muted px-4 pt-3 pb-1 uppercase">
            {section.label}
          </div>
          {section.items.map((item) => {
            const active = pathname === item.href || pathname?.startsWith(item.href + "/");
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-2.5 px-4 py-2 text-[13px] transition-colors ${
                  active
                    ? "text-brand-700 font-medium bg-brand-50"
                    : "text-text-dim hover:bg-page-bg"
                }`}
              >
                <item.icon active={active} />
                {item.name}
              </Link>
            );
          })}
        </div>
      ))}

      <div className="mt-auto px-2 pt-3 border-t border-card-border">
        <AgentStatusCard paused={paused} />
        <UserMenu
          email={email}
          initials={initials}
          hasUnread={false}
          supabaseConfigured={supabaseConfigured}
        />
      </div>
    </aside>
  );
}

function DashboardIcon({ active }: { active: boolean }) {
  return (
    <svg className={`w-4 h-4 shrink-0 ${active ? "opacity-100" : "opacity-70"}`}
      viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="2" width="5" height="5" rx="1" />
      <rect x="9" y="2" width="5" height="5" rx="1" />
      <rect x="2" y="9" width="5" height="5" rx="1" />
      <rect x="9" y="9" width="5" height="5" rx="1" />
    </svg>
  );
}

function SearchIcon({ active }: { active: boolean }) {
  return (
    <svg className={`w-4 h-4 shrink-0 ${active ? "opacity-100" : "opacity-70"}`}
      viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="6" cy="6" r="4" />
      <path d="M10.5 10.5L14 14" />
    </svg>
  );
}

function ListIcon({ active }: { active: boolean }) {
  return (
    <svg className={`w-4 h-4 shrink-0 ${active ? "opacity-100" : "opacity-70"}`}
      viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2 4h12M2 8h8M2 12h10" />
    </svg>
  );
}

function DocIcon({ active }: { active: boolean }) {
  return (
    <svg className={`w-4 h-4 shrink-0 ${active ? "opacity-100" : "opacity-70"}`}
      viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="2" width="10" height="12" rx="1" />
      <path d="M5 6h6M5 9h4" />
    </svg>
  );
}

function SettingsIcon({ active }: { active: boolean }) {
  return (
    <svg className={`w-4 h-4 shrink-0 ${active ? "opacity-100" : "opacity-70"}`}
      viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M8 2v4M8 10v4M2 8h4M10 8h4" />
      <circle cx="8" cy="8" r="2" />
    </svg>
  );
}
