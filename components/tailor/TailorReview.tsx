"use client";

import { useState } from "react";
import type { Job, CVContent } from "@/types";

type Props = {
  job: Job;
  original: CVContent;
  tailored: CVContent;
  changes: string[];
  confidence?: number; // 0-100, default 94 (matches design)
  onDiscard: () => void;
  onSaveOnly: () => void;
  onSaveAndApply: () => void;
  busy?: boolean;
};

type SectionKey = "summary" | "experience" | "skills";

// S3 — the diff view. Sectioned tabs (Summary / Experience / Skills),
// before/after pairs, optional revert per change, sticky footer with
// 3 outcomes: discard, save only, save + apply.
export default function TailorReview({
  job,
  original,
  tailored,
  changes,
  confidence = 94,
  onDiscard,
  onSaveOnly,
  onSaveAndApply,
  busy,
}: Props) {
  const [section, setSection] = useState<SectionKey>("summary");

  const expCount = Math.min(original.experience?.length || 0, tailored.experience?.length || 0);
  const skillCount = (tailored.skills || []).filter((s) => !(original.skills || []).includes(s)).length;

  return (
    <div className="flex flex-col min-h-[calc(100vh-72px)]">
      <div className="flex-1 px-8 py-6 max-w-[1280px]">
        {/* Changes banner */}
        <div className="bg-cream-50 border border-amber-bar rounded-2xl px-5 py-4 flex items-center justify-between mb-5">
          <div>
            <div className="text-[14px] font-semibold text-forest-900">
              {changes.length} {changes.length === 1 ? "change" : "changes"} made for {job.company} — {job.title}
            </div>
            <div className="text-[12px] text-text-secondary mt-0.5">
              {changes.slice(0, 3).join(" · ")}{changes.length > 3 ? ` · +${changes.length - 3} more` : ""}
            </div>
          </div>
          <button
            type="button"
            onClick={onDiscard}
            className="text-[12px] font-medium text-amber-darkest hover:text-amber-bar"
          >
            Revert all →
          </button>
        </div>

        {/* Section tabs + body */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
          <div>
            <div className="flex items-end gap-6 border-b border-cream-300 mb-5">
              <TabBtn label="Summary" active={section === "summary"} onClick={() => setSection("summary")} />
              <TabBtn label={`Experience (${expCount})`} active={section === "experience"} onClick={() => setSection("experience")} />
              <TabBtn label={`Skills (${skillCount > 0 ? `+${skillCount}` : "·"})`} active={section === "skills"} onClick={() => setSection("skills")} />
            </div>

            {section === "summary" && (
              <DiffCard
                title="Professional summary"
                before={original.summary || ""}
                after={tailored.summary || ""}
              />
            )}

            {section === "experience" && (
              <div className="space-y-4">
                {(tailored.experience || []).slice(0, expCount).map((exp, i) => {
                  const orig = original.experience?.[i];
                  const heading = `${exp.title} — ${exp.company}`;
                  const beforeBullets = (orig?.bullets || []).filter(Boolean);
                  const afterBullets = (exp.bullets || []).filter(Boolean);
                  return (
                    <DiffCard
                      key={i}
                      title={heading}
                      subtitle={[exp.start_date, exp.end_date || "Present"].filter(Boolean).join(" – ")}
                      before={beforeBullets.map((b) => `• ${b}`).join("\n")}
                      after={afterBullets.map((b) => `• ${b}`).join("\n")}
                    />
                  );
                })}
                {expCount === 0 && (
                  <p className="text-[13px] text-text-secondary italic">No experience entries to compare.</p>
                )}
              </div>
            )}

            {section === "skills" && (
              <SkillsDiff before={original.skills || []} after={tailored.skills || []} />
            )}
          </div>

          {/* Right rail — confidence + change list */}
          <aside className="self-start lg:sticky lg:top-6 space-y-3">
            <div className="bg-forest-900 text-white rounded-2xl p-5">
              <div className="text-[10px] font-bold tracking-[0.13em] text-brand-500 uppercase mb-2">
                Parsed in 2.4s
              </div>
              <div className="text-[44px] font-bold -tracking-[0.025em] leading-none">
                {confidence}%
              </div>
              <div className="text-[12px] text-warm-400 mt-1">confidence</div>
              <p className="text-[11px] text-warm-400 mt-3 leading-relaxed">
                AI is sure about most fields. If anything reads off, edit the master CV and re-tailor.
              </p>
            </div>

            <div className="bg-card-bg rounded-2xl border border-cream-300 p-5">
              <div className="text-[10px] font-bold tracking-[0.13em] uppercase text-warm-400 mb-2">
                Change list
              </div>
              <ul className="text-[12px] text-text-dim space-y-1.5">
                {changes.map((c, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-brand-500">+</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </div>

      {/* Sticky footer */}
      <div className="sticky bottom-0 bg-card-bg border-t border-cream-300 px-8 py-4 flex items-center justify-between">
        <button
          type="button"
          onClick={onDiscard}
          className="text-[12px] font-medium text-text-dim hover:text-forest-900"
        >
          Discard tailored version
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSaveOnly}
            disabled={busy}
            className="h-10 px-5 rounded-full border border-cream-300 bg-card-bg text-[13px] font-medium text-forest-900 hover:bg-page-bg disabled:opacity-50"
          >
            Save tailored CV
          </button>
          <button
            type="button"
            onClick={onSaveAndApply}
            disabled={busy}
            className="h-10 px-5 rounded-full bg-forest-900 text-white text-[13px] font-semibold hover:bg-forest-800 transition-colors disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save and apply now →"}
          </button>
        </div>
      </div>
    </div>
  );
}

function TabBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-mb-px pb-3 px-1 text-[13px] font-medium border-b-2 transition-colors ${
        active
          ? "border-forest-900 text-forest-900"
          : "border-transparent text-text-secondary hover:text-text-primary"
      }`}
    >
      {label}
    </button>
  );
}

function DiffCard({ title, subtitle, before, after }: { title: string; subtitle?: string; before: string; after: string }) {
  return (
    <div className="bg-card-bg rounded-2xl border border-cream-300 overflow-hidden">
      <div className="px-5 py-3 border-b border-cream-300 flex items-baseline justify-between">
        <div>
          <div className="text-[14px] font-semibold text-forest-900">{title}</div>
          {subtitle && <div className="text-[11px] text-text-secondary mt-0.5">{subtitle}</div>}
        </div>
        <span className="text-[10px] font-semibold tracking-[0.13em] uppercase text-amber-darkest bg-cream-50 px-2 py-0.5 rounded">
          Rewritten
        </span>
      </div>
      {before.trim() && (
        <div className="px-5 py-3 border-b border-cream-300 bg-page-bg">
          <div className="text-[10px] font-semibold tracking-[0.13em] uppercase text-warm-400 mb-1">
            Before
          </div>
          <p className="text-[12px] text-text-secondary whitespace-pre-wrap leading-relaxed line-through opacity-70">
            {before}
          </p>
        </div>
      )}
      <div className="px-5 py-3 bg-brand-soft/40">
        <div className="text-[10px] font-semibold tracking-[0.13em] uppercase text-brand-700 mb-1">
          Tailored
        </div>
        <p className="text-[13px] text-forest-900 whitespace-pre-wrap leading-relaxed">
          {after || "(empty)"}
        </p>
      </div>
    </div>
  );
}

function SkillsDiff({ before, after }: { before: string[]; after: string[] }) {
  const beforeSet = new Set(before);
  const afterSet = new Set(after);
  const added = after.filter((s) => !beforeSet.has(s));
  const removed = before.filter((s) => !afterSet.has(s));
  const kept = after.filter((s) => beforeSet.has(s));

  return (
    <div className="bg-card-bg rounded-2xl border border-cream-300 p-5">
      <div className="text-[14px] font-semibold text-forest-900 mb-4">Skills</div>

      {added.length > 0 && (
        <>
          <div className="text-[10px] font-semibold tracking-[0.13em] uppercase text-brand-700 mb-2">
            Added (+{added.length})
          </div>
          <div className="flex flex-wrap gap-1 mb-4">
            {added.map((s) => (
              <span key={s} className="px-2 py-0.5 rounded-full text-[11px] bg-brand-soft text-brand-700 border border-brand-300">
                + {s}
              </span>
            ))}
          </div>
        </>
      )}

      {kept.length > 0 && (
        <>
          <div className="text-[10px] font-semibold tracking-[0.13em] uppercase text-warm-400 mb-2">
            Kept ({kept.length})
          </div>
          <div className="flex flex-wrap gap-1 mb-4">
            {kept.map((s) => (
              <span key={s} className="px-2 py-0.5 rounded-full text-[11px] bg-page-bg text-text-dim border border-cream-300">
                {s}
              </span>
            ))}
          </div>
        </>
      )}

      {removed.length > 0 && (
        <>
          <div className="text-[10px] font-semibold tracking-[0.13em] uppercase text-amber-darkest mb-2">
            Removed (-{removed.length})
          </div>
          <div className="flex flex-wrap gap-1">
            {removed.map((s) => (
              <span key={s} className="px-2 py-0.5 rounded-full text-[11px] bg-amber-badge-bg text-amber-badge-text border border-amber-bar line-through opacity-70">
                {s}
              </span>
            ))}
          </div>
        </>
      )}

      {added.length === 0 && removed.length === 0 && (
        <p className="text-[12px] text-text-secondary italic">No skill changes — order may have shifted for relevance.</p>
      )}
    </div>
  );
}
