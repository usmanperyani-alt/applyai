"use client";

import { useState, useTransition } from "react";
import { saveMasterCV } from "@/lib/store/cv";
import { advanceToStep, finishOnboarding } from "../actions";

export default function CVUploadPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [skipPending, startSkip] = useTransition();

  async function handleFile(file: File) {
    setError(null);
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch("/api/cv/upload", { method: "POST", body: fd });
      if (!r.ok) {
        const t = await r.text().catch(() => "");
        setError(`Upload failed${t ? `: ${t.slice(0, 200)}` : ""}`);
        setBusy(false);
        return;
      }
      const json = await r.json();
      if (json?.cv) {
        await saveMasterCV(json.cv);
      }
      // Server action handles step bump + redirect.
      await advanceToStep(2);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // The redirect from advanceToStep throws — ignore that one path.
      if (!msg.includes("NEXT_REDIRECT")) {
        setError(msg);
      }
      setBusy(false);
    }
  }

  function onDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    e.stopPropagation();
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }

  return (
    <div className="min-h-screen bg-cream-100">
      {/* Top bar */}
      <div className="flex items-center justify-between px-10 py-6 border-b border-cream-300">
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-brand-500" />
          <span className="text-[14px] font-bold tracking-tight text-forest-900">applyai</span>
        </div>

        <StepPill active={1} />

        <button
          type="button"
          disabled={skipPending}
          onClick={() => startSkip(async () => {
            await finishOnboarding("/dashboard");
          })}
          className="text-[12px] font-medium text-ink-700 hover:text-forest-900 disabled:opacity-50"
        >
          Skip — I'll add my CV later
        </button>
      </div>

      {/* Body */}
      <div className="max-w-[640px] mx-auto px-6 pt-16 pb-20 text-center">
        <span className="inline-block text-[10px] font-bold tracking-[0.18em] text-brand-700 mb-3">
          STEP 1 OF 3 · UPLOAD
        </span>
        <h1 className="text-[40px] lg:text-[48px] font-bold text-forest-900 -tracking-[0.03em] leading-[1.05]">
          Add your CV.
        </h1>
        <p className="text-[15px] text-ink-700 mt-3 max-w-[460px] mx-auto">
          AI extracts your skills, roles, and bullet points so we can score and tailor jobs to your real experience.
        </p>

        <label
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onDrop={onDrop}
          className="mt-10 block bg-white rounded-3xl border-2 border-dashed border-brand-500 p-14 cursor-pointer hover:bg-cream-50 transition-colors"
        >
          <input
            type="file"
            accept="application/pdf,.pdf"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
            className="hidden"
          />
          <div className="flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-brand-soft flex items-center justify-center">
              <CloudUploadIcon className="w-6 h-6 text-brand-700" />
            </div>
            <div>
              <div className="text-[18px] font-semibold text-forest-900">
                {busy ? "Reading your CV…" : "Drop your PDF or click to browse"}
              </div>
              <div className="text-[12px] text-warm-400 mt-1">
                PDF up to 10MB · we'll never share it.
              </div>
            </div>
          </div>
        </label>

        {error && (
          <div className="mt-4 text-[12px] text-red-700 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5 text-left">
            {error}
          </div>
        )}

        <div className="mt-6 flex items-center justify-center gap-4 text-[12px] text-ink-700">
          <span className="text-warm-400">or</span>
          <button
            type="button"
            disabled
            className="opacity-50 cursor-not-allowed inline-flex items-center gap-2"
            title="Coming soon"
          >
            <LinkedInIcon className="w-3.5 h-3.5" />
            Paste LinkedIn URL
          </button>
        </div>
      </div>
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
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${
                isActive
                  ? "bg-brand-500 text-white font-semibold"
                  : isDone
                  ? "text-brand-700"
                  : "text-warm-400"
              }`}
            >
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
const CloudUploadIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
    <path d="M12 12v9" />
    <path d="m16 16-4-4-4 4" />
  </svg>
);
const CheckIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);
const LinkedInIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.95v5.66H9.36V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zm1.78 13.02H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z" />
  </svg>
);
