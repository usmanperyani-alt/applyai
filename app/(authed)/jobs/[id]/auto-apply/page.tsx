import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerClient } from "@/lib/supabase/server";
import AutoApplyOrchestrator from "./AutoApplyOrchestrator";
import type { Job } from "@/types";

type RouteParams = { params: Promise<{ id: string }> };

// Server-renders job context, hands off to client orchestrator that owns the
// prepare → review → submit state machine.
export default async function AutoApplyPage({ params }: RouteParams) {
  const { id } = await params;
  const supabase = await getServerClient();
  const { data: job, error } = await supabase
    .from("jobs")
    .select("id, source, external_id, title, company, location, remote, salary_min, salary_max, description, description_text, url, match_score, matched_skills, missing_skills, discovered_at")
    .eq("id", id)
    .maybeSingle();

  if (error || !job) notFound();

  return (
    <>
      <header className="px-8 py-5 border-b border-card-border flex items-center justify-between">
        <div className="flex items-center gap-2 text-[12px] text-text-secondary">
          <Link href="/jobs" className="hover:text-text-primary">Jobs</Link>
          <span>·</span>
          <Link href={`/jobs/${job.id}`} className="hover:text-text-primary">
            {job.company} — {job.title}
          </Link>
          <span>·</span>
          <span className="text-forest-900 font-medium">Auto-apply</span>
        </div>
        <span className="text-[10px] font-bold tracking-[0.13em] uppercase text-amber-darkest">
          ⚠ Review before submitting
        </span>
      </header>
      <AutoApplyOrchestrator job={job as Job} />
    </>
  );
}
