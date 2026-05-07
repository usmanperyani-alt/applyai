"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Job, CVContent } from "@/types";
import ApplyConfirmModal from "@/components/dashboard/ApplyConfirmModal";
import { loadMasterCV } from "@/lib/store/cv";
import { addAppliedId, addLocalApplication, getAppliedIds } from "@/lib/localStore";

type Props = {
  job: Job;
};

// Sticky footer for the job detail page. Tailor goes to the full-page
// /jobs/[id]/tailor flow (Phase E). Apply still uses the dashboard modal
// for the manual / auto-apply two-step.
export default function JobActions({ job }: Props) {
  const router = useRouter();
  const [hasCV, setHasCV] = useState<boolean | null>(null);
  const [showApply, setShowApply] = useState(false);
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    loadMasterCV().then((cv: { content: CVContent } | null) => setHasCV(Boolean(cv?.content)));
    setApplied(getAppliedIds().has(job.id));
  }, [job.id]);

  function handleApplied() {
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
    setApplied(true);
    setShowApply(false);
    router.refresh();
  }

  const tailorDisabled = !hasCV || applied;

  return (
    <>
      <div className="fixed bottom-0 left-[200px] right-0 bg-card-bg border-t border-card-border px-8 py-4 flex items-center justify-between gap-3 z-30">
        <div className="text-[12px] text-text-secondary">
          {applied ? (
            <span className="text-amber-darkest font-medium">Already applied · {new Date().toLocaleDateString()}</span>
          ) : hasCV ? (
            "Tailor your master CV to this role, then apply."
          ) : (
            <>Upload a master CV first to enable tailoring. <Link href="/cv" className="text-brand-700 underline underline-offset-2">Upload</Link></>
          )}
        </div>
        <div className="flex items-center gap-2">
          {tailorDisabled ? (
            <button
              type="button"
              disabled
              className="h-10 px-5 rounded-full border border-card-border bg-card-bg text-[13px] font-medium text-forest-900 opacity-50"
            >
              Tailor my CV
            </button>
          ) : (
            <Link
              href={`/jobs/${job.id}/tailor`}
              className="h-10 px-5 inline-flex items-center rounded-full border border-card-border bg-card-bg text-[13px] font-medium text-forest-900 hover:bg-page-bg"
            >
              Tailor my CV
            </Link>
          )}
          <button
            type="button"
            onClick={() => setShowApply(true)}
            disabled={applied}
            className="h-10 px-5 rounded-full bg-forest-900 text-white text-[13px] font-semibold hover:bg-forest-800 disabled:opacity-50"
          >
            {applied ? "Applied" : "Apply"}
          </button>
        </div>
      </div>

      {showApply && (
        <ApplyConfirmModal
          job={job}
          onClose={() => setShowApply(false)}
          onConfirmed={handleApplied}
        />
      )}
    </>
  );
}
