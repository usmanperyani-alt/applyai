"use client";

import { useEffect, useState } from "react";
import type { Job } from "@/types";
import ProgressTakeover, { type ProgressStep } from "@/components/shared/ProgressTakeover";

type Props = {
  job: Job;
  onCancel: () => void;
};

const STEP_LABELS = [
  "Reading your master CV",
  "Analyzing the job description",
  "Rewriting summary and experience bullets",
  "Repositioning skills for relevance",
  "Generating PDF",
];

// S2 — uses the shared ProgressTakeover. Real progress comes from
// /api/cv/tailor-and-save which is a single round-trip; we fake the steps
// so the user sees motion. Each animated step roughly maps to a phase
// inside the API call.
export default function TailorGenerating({ job, onCancel }: Props) {
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    if (activeIdx >= STEP_LABELS.length) return;
    // Each step gets ~2 seconds. The real API takes 8-15s; this paces nicely.
    const t = setTimeout(() => setActiveIdx((i) => i + 1), 2000);
    return () => clearTimeout(t);
  }, [activeIdx]);

  const steps: ProgressStep[] = STEP_LABELS.map((label, i) => ({
    label,
    status: i < activeIdx ? "done" : i === activeIdx ? "active" : "pending",
  }));

  const pct = Math.min(100, Math.round((activeIdx / STEP_LABELS.length) * 100));

  return (
    <ProgressTakeover
      eyebrow={`TAILORING FOR ${job.company.toUpperCase()}`}
      title="AI is rewriting your CV"
      subtitle="Working from your master facts only — nothing fabricated."
      steps={steps}
      progressPct={pct}
      cancelLabel="Cancel and keep master CV"
      onCancel={onCancel}
    />
  );
}
