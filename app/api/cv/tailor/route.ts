import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { tailorCV } from "@/lib/anthropic";

// POST /api/cv/tailor — AI-tailor a CV for a specific job
export async function POST(req: NextRequest) {
  const { cvId, jobId } = await req.json();

  if (!cvId || !jobId) {
    return NextResponse.json(
      { error: "cvId and jobId are required" },
      { status: 400 }
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

  const tailoredContent = await tailorCV(cvRes.data.content, jobRes.data);

  // Save as a new CV version
  const { data: newCV, error } = await supabase
    .from("cvs")
    .insert({
      user_id: cvRes.data.user_id,
      label: `Tailored for ${jobRes.data.company} - ${jobRes.data.title}`,
      content: tailoredContent,
      is_master: false,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ cv: newCV, tailoredContent });
}
