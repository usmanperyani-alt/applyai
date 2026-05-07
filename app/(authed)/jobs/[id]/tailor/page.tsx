import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerClient } from "@/lib/supabase/server";
import TailorOrchestrator from "./TailorOrchestrator";
import type { Job } from "@/types";

type RouteParams = { params: Promise<{ id: string }> };

// Server component that fetches the job, then hands off to the client
// orchestrator for the 4-step state machine.
export default async function TailorPage({ params }: RouteParams) {
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
          <span className="text-forest-900 font-medium">Tailor</span>
        </div>
      </header>
      <TailorOrchestrator job={job as Job} />
    </>
  );
}
