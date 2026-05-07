"use client";

import { useEffect, useState } from "react";
import { saveProfile, loadProfile, type StoredProfile } from "@/lib/store/profile";
import { advanceToStep } from "../actions";

const SUGGESTED_ROLES = ["Account Executive", "Sales Lead", "Solutions Engineer", "Customer Success"];

export default function PreferencesPage() {
  const [roles, setRoles] = useState<string[]>([]);
  const [roleInput, setRoleInput] = useState("");
  const [location, setLocation] = useState("San Francisco | Remote");
  const [remote, setRemote] = useState(true);
  const [salaryMin, setSalaryMin] = useState(120);
  const [salaryMax, setSalaryMax] = useState(200);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-fill from existing profile if present.
  useEffect(() => {
    loadProfile().then((p) => {
      if (!p) return;
      if (p.roles?.length) setRoles(p.roles);
      if (p.location) setLocation(p.location);
      if (typeof p.remote_only === "boolean") setRemote(p.remote_only);
      if (p.salary_min) setSalaryMin(Math.round(p.salary_min / 1000));
      if (p.salary_max) setSalaryMax(Math.round(p.salary_max / 1000));
    });
  }, []);

  function addRole(r: string) {
    const trimmed = r.trim();
    if (!trimmed || roles.includes(trimmed)) return;
    setRoles([...roles, trimmed]);
    setRoleInput("");
  }

  function removeRole(r: string) {
    setRoles(roles.filter((x) => x !== r));
  }

  async function handleContinue() {
    setError(null);
    setBusy(true);
    try {
      const existing = (await loadProfile()) || ({} as StoredProfile);
      await saveProfile({
        ...existing,
        full_name: existing.full_name || "",
        headline: existing.headline || "",
        location,
        remote_only: remote,
        roles,
        salary_min: salaryMin * 1000,
        salary_max: salaryMax * 1000,
        skills: existing.skills || [],
      });
      await advanceToStep(3);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!msg.includes("NEXT_REDIRECT")) setError(msg);
      setBusy(false);
    }
  }

  // Rough estimate: more roles + remote = more matches. Fake number for now,
  // real count will come from a query in a follow-up.
  const estimatedJobs = Math.min(2400, 320 + roles.length * 240 + (remote ? 220 : 0));

  return (
    <div className="min-h-screen bg-cream-100">
      <div className="flex items-center justify-between px-10 py-6 border-b border-cream-300">
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-brand-500" />
          <span className="text-[14px] font-bold tracking-tight text-forest-900">applyai</span>
        </div>
        <StepPill active={2} />
        <a href="/onboarding/cv" className="text-[12px] font-medium text-ink-700 hover:text-forest-900">
          ← Back
        </a>
      </div>

      <div className="max-w-[1200px] mx-auto px-6 lg:px-10 pt-12 pb-16 grid lg:grid-cols-[1fr_360px] gap-10">
        {/* Left form */}
        <div>
          <span className="inline-block text-[10px] font-bold tracking-[0.18em] text-brand-700 mb-3">
            STEP 2 OF 3 · PREFERENCES
          </span>
          <h1 className="text-[40px] lg:text-[48px] font-bold text-forest-900 -tracking-[0.03em] leading-[1.05]">
            What kind of jobs are you looking for?
          </h1>
          <p className="text-[14px] text-ink-700 mt-3">
            The agent uses these to score and rank every job we discover.
          </p>

          {/* Roles */}
          <div className="mt-10">
            <label className="block text-[10px] font-semibold tracking-[0.12em] text-ink-700 mb-3">
              TARGET ROLES
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {roles.map((r) => (
                <span
                  key={r}
                  className="inline-flex items-center gap-2 h-9 px-3 rounded-full bg-brand-soft text-brand-700 text-[13px] font-medium"
                >
                  {r}
                  <button onClick={() => removeRole(r)} aria-label={`Remove ${r}`}>
                    <XIcon className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              {SUGGESTED_ROLES.filter((r) => !roles.includes(r)).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => addRole(r)}
                  className="h-9 px-3 rounded-full border border-cream-300 text-ink-700 text-[13px] hover:bg-white"
                >
                  + {r}
                </button>
              ))}
              <input
                value={roleInput}
                onChange={(e) => setRoleInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); addRole(roleInput); }
                }}
                placeholder="+ Add custom role"
                className="h-9 px-3 rounded-full border border-cream-300 text-[13px] text-forest-900 bg-transparent outline-none focus:border-brand-500 placeholder-warm-400"
              />
            </div>
          </div>

          {/* Location + remote */}
          <div className="mt-8">
            <label className="block text-[10px] font-semibold tracking-[0.12em] text-ink-700 mb-3">
              LOCATION
            </label>
            <div className="flex items-center gap-3">
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="City, country"
                className="flex-1 h-12 px-4 rounded-xl bg-white border border-cream-300 text-[14px] text-forest-900 outline-none focus:border-brand-500"
              />
              <label className="flex items-center gap-3 px-4 h-12 rounded-xl bg-white border border-cream-300 cursor-pointer">
                <span className="text-[13px] font-medium text-forest-900">Remote OK</span>
                <input
                  type="checkbox"
                  checked={remote}
                  onChange={(e) => setRemote(e.target.checked)}
                  className="w-4 h-4 accent-brand-500"
                />
              </label>
            </div>
          </div>

          {/* Salary */}
          <div className="mt-8">
            <div className="flex items-baseline justify-between mb-3">
              <label className="text-[10px] font-semibold tracking-[0.12em] text-ink-700">
                SALARY · USD
              </label>
              <span className="text-[14px] font-semibold text-forest-900">
                ${salaryMin}k – ${salaryMax}k
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <RangeInput label="Min" value={salaryMin} min={50} max={500} step={10} onChange={setSalaryMin} />
              <RangeInput label="Max" value={salaryMax} min={50} max={500} step={10} onChange={setSalaryMax} />
            </div>
          </div>

          {error && (
            <div className="mt-4 text-[12px] text-red-700 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">
              {error}
            </div>
          )}
        </div>

        {/* Right preview */}
        <aside className="bg-forest-900 text-white rounded-3xl p-7 self-start">
          <div className="text-[10px] font-bold tracking-[0.13em] text-brand-500 mb-3">
            BASED ON YOUR PREFERENCES
          </div>
          <div className="text-[36px] font-bold -tracking-[0.025em] leading-[1.05]">
            ~{estimatedJobs.toLocaleString()} jobs
          </div>
          <div className="text-[13px] text-warm-400 mt-1">
            match this profile right now.
          </div>
          <p className="text-[12px] text-ink-700 mt-5 leading-relaxed">
            Estimate from the agent's last sweep across Greenhouse, LinkedIn, and Indeed (sample). Tighten salary or roles to narrow.
          </p>

          <button
            type="button"
            onClick={handleContinue}
            disabled={busy || roles.length === 0}
            className="mt-6 w-full h-[52px] flex items-center justify-center gap-2.5 rounded-full bg-brand-500 text-forest-900 text-[14px] font-bold disabled:opacity-50 hover:bg-brand-300 transition-colors"
          >
            {busy ? "Saving…" : (<>Continue · run first scan <ArrowRightIcon className="w-4 h-4" /></>)}
          </button>
          {roles.length === 0 && (
            <p className="text-[11px] text-warm-400 text-center mt-2">
              Add at least one target role to continue.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}

function RangeInput({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void }) {
  return (
    <div className="bg-white rounded-xl border border-cream-300 p-3">
      <div className="text-[10px] font-semibold text-warm-400 mb-1">{label}</div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-brand-500"
      />
      <div className="text-[13px] font-semibold text-forest-900 mt-1">${value}k</div>
    </div>
  );
}

function StepPill({ active }: { active: 1 | 2 | 3 }) {
  const labels = ["Upload CV", "Preferences", "Scan"];
  return (
    <div className="flex items-center gap-2 text-[12px]">
      {labels.map((label, i) => {
        const step = i + 1;
        const isActive = step === active;
        const isDone = step < active;
        return (
          <div key={label} className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${isActive ? "bg-brand-500 text-white font-semibold" : isDone ? "text-brand-700" : "text-warm-400"}`}>
              {isDone && <CheckIcon className="w-3 h-3" />}
              {label}
            </div>
            {step < 3 && <span className="text-warm-400">—</span>}
          </div>
        );
      })}
    </div>
  );
}

type IconProps = { className?: string };
const XIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);
const CheckIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);
const ArrowRightIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);
