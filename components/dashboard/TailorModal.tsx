"use client";

import { useState } from "react";
import type { Job, CVContent } from "@/types";

interface TailorModalProps {
  job: Job;
  cv: CVContent | null;
  onClose: () => void;
}

interface TailorResponse {
  tailoredContent: CVContent;
  changes: string[];
  error?: string;
}

export default function TailorModal({ job, cv, onClose }: TailorModalProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TailorResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runTailor = async () => {
    if (!cv) {
      setError("Upload a CV first to tailor it for this job.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/cv/tailor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cv,
          job: {
            title: job.title,
            company: job.company,
            description: job.description?.replace(/<[^>]*>/g, " ") || "",
          },
        }),
      });
      const data: TailorResponse = await res.json();
      if (!res.ok) {
        setError(data.error || "Tailoring failed");
      } else {
        setResult(data);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-card-bg rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-3 border-b border-card-border flex items-center justify-between">
          <div>
            <div className="text-[14px] font-medium">AI Tailor for Job</div>
            <div className="text-[11px] text-text-secondary mt-0.5">
              {job.title} · {job.company}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg border border-card-border flex items-center justify-center hover:bg-page-bg cursor-pointer text-[16px]"
          >
            &times;
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {!result && !loading && (
            <div className="text-center py-8">
              <div className="text-[13px] text-text-dim mb-3">
                Claude will rewrite your CV to emphasize the experience most relevant to this role.
              </div>
              <div className="text-[11px] text-text-secondary mb-5 max-w-md mx-auto">
                Strict rule: only facts from your master CV are used. Nothing is fabricated.
              </div>
              {!cv && (
                <div className="text-[12px] text-amber-badge-text bg-amber-badge-bg border border-amber-bar rounded-lg p-3 mb-4 max-w-md mx-auto">
                  Upload a CV on the CV Editor page first.
                </div>
              )}
              <button
                onClick={runTailor}
                disabled={!cv}
                className="px-4 py-2 rounded-lg text-[13px] font-medium bg-brand-500 text-white hover:bg-brand-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cv ? "Tailor CV with Claude" : "CV required"}
              </button>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
              <div className="text-[13px] text-text-dim">
                Claude is rewriting your CV for {job.company}...
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-3 text-[12px]">
              {error}
            </div>
          )}

          {result && (
            <div>
              {/* Changes summary */}
              <div className="mb-4 p-3 bg-brand-50 border border-brand-300 rounded-lg">
                <div className="text-[12px] font-medium text-brand-700 mb-1.5">
                  Changes made
                </div>
                <ul className="text-[11px] text-brand-900 space-y-0.5">
                  {result.changes.map((c, i) => (
                    <li key={i} className="flex gap-1.5">
                      <span>•</span><span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Side-by-side diff */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[11px] font-medium text-text-secondary mb-1">Original</div>
                  <div className="bg-page-bg rounded-lg p-3 text-[11px] text-text-dim leading-relaxed max-h-[400px] overflow-y-auto">
                    <CVPreview cv={cv!} />
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-medium text-brand-700 mb-1">Tailored</div>
                  <div className="bg-brand-50 border border-brand-300 rounded-lg p-3 text-[11px] text-brand-900 leading-relaxed max-h-[400px] overflow-y-auto">
                    <CVPreview cv={result.tailoredContent} />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mt-4 pt-4 border-t border-card-border">
                <button
                  onClick={() => {
                    if (result.tailoredContent) {
                      const blob = new Blob([JSON.stringify(result.tailoredContent, null, 2)], { type: "application/json" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `cv-tailored-${job.company.toLowerCase().replace(/\s+/g, "-")}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }
                  }}
                  className="px-3 py-2 rounded-lg text-[12px] border border-card-border bg-card-bg hover:bg-page-bg transition-colors cursor-pointer"
                >
                  Download tailored CV (JSON)
                </button>
                <button
                  onClick={onClose}
                  className="px-3 py-2 rounded-lg text-[12px] bg-brand-500 text-white hover:bg-brand-700 transition-colors cursor-pointer ml-auto"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CVPreview({ cv }: { cv: CVContent }) {
  return (
    <div className="space-y-3">
      {cv.summary && (
        <div>
          <div className="text-[10px] uppercase tracking-wider opacity-70 mb-1">Summary</div>
          <p>{cv.summary}</p>
        </div>
      )}
      {cv.experience?.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-wider opacity-70 mb-1">Experience</div>
          {cv.experience.map((exp, i) => (
            <div key={i} className={i > 0 ? "mt-2" : ""}>
              <div className="font-medium">{exp.title} · {exp.company}</div>
              <ul className="mt-0.5 space-y-0.5">
                {(exp.bullets || []).filter(Boolean).map((b, j) => (
                  <li key={j} className="pl-2 relative before:content-['•'] before:absolute before:left-0 before:opacity-50">
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
      {cv.skills?.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-wider opacity-70 mb-1">Skills</div>
          <div className="flex flex-wrap gap-1">
            {cv.skills.map((s) => (
              <span key={s} className="px-1.5 py-0.5 rounded bg-white/50 text-[10px]">{s}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
