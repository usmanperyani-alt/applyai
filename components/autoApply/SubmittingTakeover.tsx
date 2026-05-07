"use client";

import { useEffect, useState } from "react";
import type { Job } from "@/types";
import ProgressTakeover, { type ProgressStep } from "@/components/shared/ProgressTakeover";

type Props = {
  job: Job;
};

const STEP_LABELS = [
  "Form fields filled · CV attached",
  "Clicking submit on Greenhouse's form",
  "Waiting for confirmation",
];

// S2-style takeover but for the apply submit phase. Mirrors the design
// `Bh19a` (Auto-apply · Submitting). Cancel intentionally not offered —
// once submit fires we let it complete; the API call decides outcome.
export default function SubmittingTakeover({ job }: Props) {
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    if (activeIdx >= STEP_LABELS.length) return;
    // Real submit is one network call; UI ticks are cosmetic so the user
    // sees motion. Last step intentionally lingers (waiting for confirmation).
    const t = setTimeout(() => setActiveIdx((i) => i + 1), 1500);
    return () => clearTimeout(t);
  }, [activeIdx]);

  const steps: ProgressStep[] = STEP_LABELS.map((label, i) => ({
    label,
    status: i < activeIdx ? "done" : i === activeIdx ? "active" : "pending",
  }));

  const pct = Math.min(100, Math.round((activeIdx / STEP_LABELS.length) * 100));

  return (
    <ProgressTakeover
      eyebrow={`SUBMITTING TO ${job.company.toUpperCase()}`}
      title="Submitting your application…"
      subtitle="Don't close this tab. Greenhouse usually confirms within 30 seconds."
      steps={steps}
      progressPct={pct}
    />
  );
}
