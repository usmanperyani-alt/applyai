import { NextRequest, NextResponse } from "next/server";
import { tailorCVForJob } from "@/lib/cv/tailor";
import { hasSupabase, getServiceClient } from "@/lib/supabase";
import type { CVContent } from "@/types";

// POST /api/cv/tailor — AI-tailor a CV for a specific job
//
// Two modes:
//   A) Supabase mode — body { cvId, jobId } → fetches both, tailors, saves new CV row
//   B) Inline mode  — body { cv, job } → tailors and returns without persistence
//      (used when Supabase isn't configured; CV+job are sent from the client)
export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not set. Add it to .env.local to enable AI tailoring." },
      { status: 503 }
    );
  }

  const body = await req.json();

  // Inline mode: client sends CV + job directly
  if (body.cv && body.job) {
    const { tailored, changes } = await tailorCVForJob(body.cv as CVContent, body.job);
    return NextResponse.json({ tailoredContent: tailored, changes });
  }

  // Supabase mode: client sends cvId + jobId
  const { cvId, jobId } = body;
  if (!cvId || !jobId) {
    return NextResponse.json(
      { error: "Provide either { cv, job } or { cvId, jobId }" },
      { status: 400 }
    );
  }

  if (!hasSupabase()) {
    return NextResponse.json(
      { error: "Supabase is not configured. Use the inline mode by sending { cv, job }." },
      { status: 503 }
    );
  }

  const supabase = getServiceClient();
  const [cvRes, jobRes] = await Promise.all([
    supabase.from("cvs").select("*").eq("id", cvId).single(),
    supabase.from("jobs").select("*").eq("id", jobId).single(),
  ]);

  if (cvRes.error || !cvRes.data) {
    return NextResponse.json({ error: "CV not found" }, { status: 404 });
  }
  if (jobRes.error || !jobRes.data) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const { tailored, changes } = await tailorCVForJob(cvRes.data.content, jobRes.data);

  // Save as a new CV version, linked to the target job
  const { data: newCV, error } = await supabase
    .from("cvs")
    .insert({
      user_id: cvRes.data.user_id,
      label: `Tailored for ${jobRes.data.company} — ${jobRes.data.title}`,
      content: tailored,
      is_master: false,
      tailored_for_job_id: jobId,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ cv: newCV, tailoredContent: tailored, changes });
}
