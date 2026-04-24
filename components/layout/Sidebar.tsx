"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navSections = [
  {
    label: "Overview",
    items: [
      { name: "Dashboard", href: "/dashboard", icon: DashboardIcon },
      { name: "Job Discovery", href: "/jobs", icon: SearchIcon },
      { name: "Applications", href: "/applications", icon: ListIcon },
    ],
  },
  {
    label: "Tools",
    items: [
      { name: "CV Editor", href: "/cv", icon: DocIcon },
      { name: "Preferences", href: "/preferences", icon: SettingsIcon },
      { name: "Analytics", href: "/analytics", icon: ChartIcon },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[200px] bg-card-bg border-r border-card-border flex flex-col shrink-0"
      style={{ padding: "16px 0" }}>
      {/* Logo */}
      <div className="px-4 pb-5 flex items-center gap-2">
        <div className="w-6 h-6 bg-brand-500 rounded-[6px]"></div>
      </div>

      {/* Navigation */}
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

      {/* Bottom user */}
      <div className="mt-auto px-4 pt-3 border-t border-card-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-xs font-medium text-brand-900">
            UM
          </div>
          <div>
            <div className="text-xs font-medium">Usman</div>
            <div className="text-[11px] text-text-secondary">Active agent</div>
          </div>
        </div>
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

function ChartIcon({ active }: { active: boolean }) {
  return (
    <svg className={`w-4 h-4 shrink-0 ${active ? "opacity-100" : "opacity-70"}`}
      viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2 10L6 6L9 9L14 4" />
    </svg>
  );
}
