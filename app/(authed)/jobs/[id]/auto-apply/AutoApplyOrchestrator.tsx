"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Job } from "@/types";
import { loadProfile, type StoredProfile } from "@/lib/store/profile";
import { addAppliedId, addLocalApplication } from "@/lib/localStore";
import FormSnapshot from "@/components/autoApply/FormSnapshot";
import FillChecklist from "@/components/autoApply/FillChecklist";
import SubmittingTakeover from "@/components/autoApply/SubmittingTakeover";

type Step = "loading" | "review" | "submitting" | "manual" | "error" | "success";

type PrepareResult = {
  ats: string;
  success: boolean;
  message?: string;
  screenshot?: string | null;
  filledFields?: Record<string, string>;
  unfilledRequiredFields?: string[];
  submitPayload?: { jobUrl: string; applicant: Record<string, unknown> };
};

export default function AutoApplyOrchestrator({ job }: { job: Job }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("loading");
  const [profile, setProfile] = useState<StoredProfile | null>(null);
  const [prepResult, setPrepResult] = useState<PrepareResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [whyThisRole, setWhyThisRole] = useState("");

  // Load profile once on mount, then trigger prepare.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const p = await loadProfile();
      if (cancelled) return;
      setProfile(p);

      if (!job.url) {
        setError("This job has no application URL on file. Use Tailor on a different posting.");
        setStep("error");
        return;
      }

      // No profile → can't prepare. Drop to manual mode.
      if (!p?.full_name || !p?.email) {
        setStep("manual");
        return;
      }

      const [firstName, ...rest] = (p.full_name || "").split(" ");
      const lastName = rest.join(" ") || firstName;

      try {
        const res = await fetch("/api/auto-apply/prepare", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jobUrl: job.url,
            applicant: {
              firstName,
              lastName,
              email: p.email,
              phone: p.phone || "",
              linkedinUrl: p.linkedin_url,
              // Server-side resume materialization isn't wired yet. Pass a
              // placeholder; the API will reject if it can't find the file.
              // The UI handles the failure gracefully (drops to manual mode).
              resumePath: "/tmp/applai-resume.pdf",
            },
          }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          // Common case: ATS not Greenhouse, or playwright/resume missing.
          // Flip to manual-apply mode so the user can still apply via the link.
          setError(data.error || "Could not prepare auto-apply for this job.");
          setStep("manual");
          return;
        }
        setPrepResult(data);
        setStep("review");
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Network error preparing application.");
        setStep("manual");
      }
    })();
    return () => { cancelled = true; };
  }, [job.url, job.id]);

  async function handleSubmit() {
    if (!prepResult?.submitPayload) return;
    setStep("submitting");
    try {
      const res = await fetch("/api/auto-apply/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...prepResult.submitPayload,
          confirmed: true,
          jobId: job.id,
          // applicant.coverLetter merge if user typed something
          applicant: {
            ...(prepResult.submitPayload.applicant as Record<string, unknown>),
            coverLetter: whyThisRole || undefined,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || data.message || "Submit failed");
        setStep("error");
        return;
      }
      // Record locally too so the Applications page shows it immediately.
      addAppliedId(job.id);
      addLocalApplication({
        id: job.id,
        job_id: job.id,
        cv_id: null,
        status: "applied",
        applied_at: new Date().toISOString(),
        auto_applied: true,
        job_snapshot: {
          title: job.title,
          company: job.company,
          location: job.location,
          match_score: job.match_score,
          url: job.url,
        },
      });
      router.push(`/applications`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error during submit.");
      setStep("error");
    }
  }

  function recordManualApply() {
    addAppliedId(job.id);
    addLocalApplication({
      id: job.id,
      job_id: job.id,
      cv_id: null,
      status: "applied",
      applied_at: new Date().toISOString(),
      auto_applied: false,
      job_snapshot: {
        title: job.title,
        company: job.company,
        location: job.location,
        match_score: job.match_score,
        url: job.url,
      },
    });
    router.push("/applications");
  }

  if (step === "loading") {
    return (
      <div className="flex items-center justify-center h-[60vh] text-text-secondary text-[13px]">
        <span className="inline-flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse-dot" />
          Filling the form for you…
        </span>
      </div>
    );
  }

  if (step === "submitting") {
    return <SubmittingTakeover job={job} />;
  }

  if (step === "manual" || step === "error") {
    const isError = step === "error";
    return (
      <div className="px-8 py-12 max-w-[640px]">
        <h1 className="text-[28px] font-bold text-forest-900 -tracking-[0.025em]">
          {isError ? "Something went wrong" : "Manual apply"}
        </h1>
        <p className="text-[14px] text-ink-700 mt-2 leading-relaxed">
          {error ||
            (isError
              ? "We hit an error during submit. Open the original posting to apply manually, then mark this job applied."
              : "We can't auto-apply this one yet — different ATS or missing resume on file. Open the original posting and we'll record the application after.")}
        </p>

        <div className="mt-7 flex flex-col gap-2 max-w-[420px]">
          <a
            href={job.url || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 h-[48px] rounded-full bg-forest-900 text-white text-[14px] font-semibold hover:bg-forest-800 transition-colors"
          >
            Open original posting →
          </a>
          <button
            type="button"
            onClick={recordManualApply}
            className="inline-flex items-center justify-center gap-2 h-10 rounded-full text-[12px] text-text-dim hover:text-forest-900 transition-colors"
          >
            Mark as applied (I sent it manually)
          </button>
          <Link
            href={`/jobs/${job.id}`}
            className="inline-flex items-center justify-center gap-2 h-10 rounded-full text-[12px] text-warm-400 hover:text-ink-700 transition-colors"
          >
            ← Back to job
          </Link>
        </div>
      </div>
    );
  }

  // review
  if (!prepResult) return null;
  const filledCount = Object.keys(prepResult.filledFields || {}).length;
  const unfilled = prepResult.unfilledRequiredFields || [];
  const ready = unfilled.length === 0 || whyThisRole.trim().length > 0;

  return (
    <div className="flex flex-col min-h-[calc(100vh-72px)]">
      <div className="flex-1 px-8 py-7">
        <div className="mb-6">
          <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-cream-50 text-amber-darkest text-[10px] font-bold tracking-[0.13em] uppercase mb-3">
            Auto-apply review
          </span>
          <h1 className="text-[36px] font-bold text-forest-900 -tracking-[0.025em] leading-tight">
            We've filled the form. Look it over.
          </h1>
          <div className="text-[13px] text-text-secondary mt-1.5">
            <span className="font-medium text-forest-900">{job.company}</span>
            <span className="mx-2">·</span>
            <span>{job.title}</span>
            <span className="mx-2">·</span>
            <span>{filledCount} fields filled</span>
            {unfilled.length > 0 && (
              <>
                <span className="mx-2">·</span>
                <span className="text-amber-darkest font-medium">{unfilled.length} need your input</span>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
          <FormSnapshot
            screenshot={prepResult.screenshot}
            ats={prepResult.ats}
            jobUrl={job.url || "#"}
          />
          <FillChecklist
            filledFields={prepResult.filledFields || {}}
            unfilledRequired={unfilled}
            cvAttached={true}
            whyThisRole={whyThisRole}
            onWhyChange={setWhyThisRole}
          />
        </div>
      </div>

      <div className="sticky bottom-0 bg-card-bg border-t border-cream-300 px-8 py-4 flex items-center justify-between">
        <Link
          href={`/jobs/${job.id}`}
          className="text-[12px] font-medium text-text-dim hover:text-forest-900"
        >
          Cancel · don't submit
        </Link>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!ready}
          className="inline-flex items-center gap-2 h-11 px-6 rounded-full bg-forest-900 text-white text-[13px] font-semibold disabled:opacity-50 hover:bg-forest-800 transition-colors"
        >
          {ready ? "Submit application →" : "Fill required field above"}
        </button>
      </div>
    </div>
  );
}
