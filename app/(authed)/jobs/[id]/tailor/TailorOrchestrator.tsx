"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Job, CVContent } from "@/types";
import { loadMasterCV } from "@/lib/store/cv";
import { loadProfile, type StoredProfile } from "@/lib/store/profile";
import TailorSetup from "@/components/tailor/TailorSetup";
import TailorGenerating from "@/components/tailor/TailorGenerating";
import TailorReview from "@/components/tailor/TailorReview";
import TailorSaved from "@/components/tailor/TailorSaved";

type Step = "setup" | "generating" | "review" | "saved";

type TailorResult = {
  cvId: string | null;
  pdfUrl: string | null;
  tailoredContent: CVContent;
  changes: string[];
  mode?: string;
};

export default function TailorOrchestrator({ job }: { job: Job }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("setup");
  const [masterCV, setMasterCV] = useState<CVContent | null>(null);
  const [profile, setProfile] = useState<StoredProfile | null>(null);
  const [result, setResult] = useState<TailorResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingApply, setPendingApply] = useState(false);

  // Load master CV + profile once on mount.
  useEffect(() => {
    loadMasterCV().then((cv) => setMasterCV(cv?.content ?? null));
    loadProfile().then(setProfile);
  }, []);

  // Kick off the actual API call when entering "generating".
  useEffect(() => {
    if (step !== "generating" || !masterCV) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/cv/tailor-and-save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cv: masterCV,
            job: {
              id: job.id,
              title: job.title,
              company: job.company,
              description: job.description?.replace(/<[^>]*>/g, " ") || "",
            },
            header: profile
              ? {
                  name: profile.full_name,
                  headline: profile.headline,
                  location: profile.location,
                  email: profile.email,
                  phone: profile.phone,
                  linkedin_url: profile.linkedin_url,
                }
              : {},
          }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error || "Tailoring failed");
          setStep("setup");
          return;
        }
        setResult(data as TailorResult);
        setStep("review");
      } catch {
        if (cancelled) return;
        setError("Network error. Please try again.");
        setStep("setup");
      }
    })();
    return () => { cancelled = true; };
  }, [step, masterCV, profile, job]);

  // Auto-redirect to auto-apply 1.5s after Saved view appears (when triggered
  // via Save and apply now). Pure Save ends at "saved" without redirect.
  useEffect(() => {
    if (step !== "saved" || !pendingApply) return;
    const t = setTimeout(() => {
      router.push(`/jobs/${job.id}/auto-apply`);
    }, 1500);
    return () => clearTimeout(t);
  }, [step, pendingApply, job.id, router]);

  if (step === "setup") {
    return (
      <>
        {error && (
          <div className="mx-8 mt-4 text-[12px] text-red-700 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">
            {error}
          </div>
        )}
        <TailorSetup
          job={job}
          cv={masterCV}
          profile={profile}
          onGenerate={() => { setError(null); setStep("generating"); }}
          onSkip={() => router.push(`/jobs/${job.id}/auto-apply`)}
        />
      </>
    );
  }

  if (step === "generating") {
    return (
      <TailorGenerating
        job={job}
        onCancel={() => setStep("setup")}
      />
    );
  }

  if (step === "review" && result && masterCV) {
    return (
      <TailorReview
        job={job}
        original={masterCV}
        tailored={result.tailoredContent}
        changes={result.changes || []}
        confidence={94}
        onDiscard={() => {
          setResult(null);
          setStep("setup");
        }}
        onSaveOnly={() => {
          // Tailor-and-save already persisted (when Supabase is available).
          // Just transition to saved with no auto-apply.
          setPendingApply(false);
          setStep("saved");
        }}
        onSaveAndApply={() => {
          setPendingApply(true);
          setStep("saved");
        }}
      />
    );
  }

  if (step === "saved" && result) {
    return (
      <TailorSaved
        job={job}
        cv={result.tailoredContent}
        profile={profile}
        cvId={result.cvId}
        pdfUrl={result.pdfUrl}
        onApply={() => router.push(`/jobs/${job.id}/auto-apply`)}
      />
    );
  }

  // Fallback: shouldn't hit, but guard against weird states.
  return null;
}
