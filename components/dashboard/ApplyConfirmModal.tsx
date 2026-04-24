"use client";

import { useState } from "react";
import type { Job } from "@/types";

interface ApplyConfirmModalProps {
  job: Job;
  onClose: () => void;
  onConfirmed: () => void;
}

/**
 * A two-step apply flow.
 *
 * Step 1: User chooses how to apply (manual link vs auto-apply).
 * Step 2 (auto-apply only): Show prepare result with screenshot, require explicit submit.
 *
 * Auto-apply runs Playwright on the server; in dev without Playwright browsers
 * installed, it will return an error which we surface clearly.
 */
export default function ApplyConfirmModal({ job, onClose, onConfirmed }: ApplyConfirmModalProps) {
  const [mode, setMode] = useState<"choose" | "preparing" | "review" | "submitting">("choose");
  const [error, setError] = useState<string | null>(null);
  const [previewScreenshot, setPreviewScreenshot] = useState<string | null>(null);
  const [filledFields, setFilledFields] = useState<Record<string, string>>({});
  const [unfilledFields, setUnfilledFields] = useState<string[]>([]);

  const recordManual = () => {
    onConfirmed();
    onClose();
  };

  const startAutoApply = async () => {
    setMode("preparing");
    setError(null);
    try {
      const res = await fetch("/api/auto-apply/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobUrl: job.url,
          applicant: {
            firstName: "Test",
            lastName: "User",
            email: "test@example.com",
            phone: "+1 555 555 5555",
            resumePath: "/tmp/resume.pdf", // would need a real path in production
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Auto-apply preparation failed");
        setMode("choose");
        return;
      }
      setPreviewScreenshot(data.screenshot || null);
      setFilledFields(data.filledFields || {});
      setUnfilledFields(data.unfilledRequiredFields || []);
      setMode("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
      setMode("choose");
    }
  };

  const submitApplication = async () => {
    setMode("submitting");
    setError(null);
    try {
      const res = await fetch("/api/auto-apply/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobUrl: job.url,
          confirmed: true,
          applicant: {
            firstName: "Test",
            lastName: "User",
            email: "test@example.com",
            phone: "+1 555 555 5555",
            resumePath: "/tmp/resume.pdf",
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || data.error || "Submission failed");
        setMode("review");
        return;
      }
      onConfirmed();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
      setMode("review");
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-card-bg rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <div className="px-5 py-3 border-b border-card-border flex items-center justify-between">
          <div>
            <div className="text-[14px] font-medium">Apply to {job.company}</div>
            <div className="text-[11px] text-text-secondary">{job.title}</div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg border border-card-border flex items-center justify-center hover:bg-page-bg cursor-pointer text-[16px]"
          >
            &times;
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-3 text-[12px] mb-4">
              {error}
            </div>
          )}

          {mode === "choose" && (
            <div className="space-y-3">
              <div className="text-[12px] text-text-dim mb-2">
                How would you like to apply?
              </div>

              {/* Manual */}
              <button
                onClick={() => {
                  if (job.url) window.open(job.url, "_blank", "noopener,noreferrer");
                  recordManual();
                }}
                className="w-full text-left p-4 rounded-lg border border-card-border hover:bg-page-bg transition-colors cursor-pointer"
              >
                <div className="text-[13px] font-medium mb-1">Open and apply manually</div>
                <div className="text-[11px] text-text-secondary">
                  Opens the job posting in a new tab. We&apos;ll mark it as applied locally so you can track it.
                </div>
              </button>

              {/* Auto-apply */}
              <button
                onClick={startAutoApply}
                className="w-full text-left p-4 rounded-lg border border-brand-300 bg-brand-50 hover:bg-brand-100 transition-colors cursor-pointer"
              >
                <div className="text-[13px] font-medium text-brand-700 mb-1">
                  Auto-fill the application (preview first)
                </div>
                <div className="text-[11px] text-brand-900">
                  Opens a headless browser, fills the form, takes a screenshot. You review and submit.
                  Works for Greenhouse-hosted jobs only right now. Requires Playwright browsers installed locally.
                </div>
              </button>
            </div>
          )}

          {mode === "preparing" && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
              <div className="text-[13px] text-text-dim">
                Filling the application form...
              </div>
              <div className="text-[10px] text-text-secondary">
                This can take 10-30 seconds
              </div>
            </div>
          )}

          {mode === "review" && (
            <div className="space-y-3">
              <div className="text-[12px] text-text-dim">
                Review the filled form below. Click <b>Submit application</b> to actually send it.
              </div>

              {Object.keys(filledFields).length > 0 && (
                <div className="bg-page-bg rounded-lg p-3 text-[11px]">
                  <div className="font-medium mb-1">Filled fields:</div>
                  <ul className="space-y-0.5 text-text-dim">
                    {Object.entries(filledFields).map(([k, v]) => (
                      <li key={k}>
                        <span className="font-medium">{k}:</span> {v}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {unfilledFields.length > 0 && (
                <div className="bg-amber-badge-bg border border-amber-bar rounded-lg p-3 text-[11px]">
                  <div className="font-medium text-amber-badge-text mb-1">
                    Required fields detected but not filled:
                  </div>
                  <ul className="space-y-0.5 text-amber-badge-text">
                    {unfilledFields.slice(0, 5).map((f, i) => (
                      <li key={i}>• {f}</li>
                    ))}
                  </ul>
                  <div className="text-[10px] text-amber-badge-text/80 mt-2">
                    These usually need manual input (custom questions, EEO, work auth).
                  </div>
                </div>
              )}

              {previewScreenshot && (
                <div>
                  <div className="text-[11px] font-medium text-text-secondary mb-1">Form screenshot</div>
                  <img
                    src={previewScreenshot}
                    alt="Filled application form"
                    className="w-full border border-card-border rounded-lg"
                  />
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setMode("choose")}
                  className="px-3 py-2 rounded-lg text-[12px] border border-card-border bg-card-bg hover:bg-page-bg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={submitApplication}
                  className="px-3 py-2 rounded-lg text-[12px] bg-red-600 text-white hover:bg-red-700 transition-colors cursor-pointer ml-auto"
                >
                  Submit application
                </button>
              </div>
            </div>
          )}

          {mode === "submitting" && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
              <div className="text-[13px] text-text-dim">Submitting application...</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
