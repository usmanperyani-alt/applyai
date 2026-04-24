import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { matchJobToProfile } from "@/lib/anthropic";

// POST /api/jobs/match — score a job against a user profile
export async function POST(req: NextRequest) {
  const { jobId, profileId } = await req.json();

  if (!jobId || !profileId) {
    return NextResponse.json(
      { error: "jobId and profileId are required" },
      { status: 400 }
    );
  }

  const supabase = getServiceClient();

  // Fetch job and profile in parallel
  const [jobRes, profileRes] = await Promise.all([
    supabase.from("jobs").select("*").eq("id", jobId).single(),
    supabase.from("profiles").select("*").eq("id", profileId).single(),
  ]);

  if (jobRes.error || !jobRes.data) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }
  if (profileRes.error || !profileRes.data) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const result = await matchJobToProfile(profileRes.data, jobRes.data);

  // Update job with match score
  await supabase
    .from("jobs")
    .update({
      match_score: result.score,
      matched_skills: result.matched_skills,
      missing_skills: result.missing_skills,
    })
    .eq("id", jobId);

  return NextResponse.json(result);
}
