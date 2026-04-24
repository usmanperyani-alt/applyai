import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

// POST /api/apply — create an application record
export async function POST(req: NextRequest) {
  const { userId, jobId, cvId, autoApplied = false } = await req.json();

  if (!userId || !jobId) {
    return NextResponse.json(
      { error: "userId and jobId are required" },
      { status: 400 }
    );
  }

  const supabase = getServiceClient();

  // Check for duplicate application
  const { data: existing } = await supabase
    .from("applications")
    .select("id")
    .eq("user_id", userId)
    .eq("job_id", jobId)
    .single();

  if (existing) {
    return NextResponse.json(
      { error: "Already applied to this job" },
      { status: 409 }
    );
  }

  const { data, error } = await supabase
    .from("applications")
    .insert({
      user_id: userId,
      job_id: jobId,
      cv_id: cvId || null,
      auto_applied: autoApplied,
      status: "applied",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ application: data }, { status: 201 });
}

// GET /api/apply — list user's applications
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("user_id");

  if (!userId) {
    return NextResponse.json({ error: "user_id is required" }, { status: 400 });
  }

  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from("applications")
    .select("*, jobs(*)")
    .eq("user_id", userId)
    .order("applied_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ applications: data });
}
