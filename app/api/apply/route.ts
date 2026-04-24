import { NextRequest, NextResponse } from "next/server";
import { hasSupabase, getServiceClient } from "@/lib/supabase";

// POST /api/apply — record an application
//
// When Supabase is configured, writes to the applications table.
// When not, returns success and the client persists to localStorage.
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { userId, jobId, cvId, autoApplied = false, jobSnapshot } = body;

  if (!jobId) {
    return NextResponse.json({ error: "jobId is required" }, { status: 400 });
  }

  // Local-only mode: return success, the client handles persistence
  if (!hasSupabase()) {
    return NextResponse.json({
      application: {
        id: jobId,
        job_id: jobId,
        cv_id: cvId || null,
        status: "applied",
        applied_at: new Date().toISOString(),
        auto_applied: autoApplied,
        job_snapshot: jobSnapshot || null,
      },
      mode: "local",
    }, { status: 201 });
  }

  // Supabase mode: requires userId
  if (!userId) {
    return NextResponse.json({ error: "userId is required when Supabase is configured" }, { status: 400 });
  }

  const supabase = getServiceClient();

  // Check for duplicate application
  const { data: existing } = await supabase
    .from("applications")
    .select("id")
    .eq("user_id", userId)
    .eq("job_id", jobId)
    .maybeSingle();

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

  return NextResponse.json({ application: data, mode: "supabase" }, { status: 201 });
}

// GET /api/apply — list applications
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("user_id");

  // Local-only mode: client should read from localStorage instead
  if (!hasSupabase()) {
    return NextResponse.json({
      applications: [],
      mode: "local",
      message: "Supabase not configured — read from localStorage on the client.",
    });
  }

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

  return NextResponse.json({ applications: data, mode: "supabase" });
}
