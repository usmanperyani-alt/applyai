import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, getServerClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase";

// POST /api/apply — record an application
//
// When authenticated: writes to applications under the user's session (RLS).
// When unauthenticated or Supabase off: returns success and the client persists
// to localStorage.
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { jobId, cvId, autoApplied = false, jobSnapshot } = body;

  if (!jobId) {
    return NextResponse.json({ error: "jobId is required" }, { status: 400 });
  }

  const user = await getCurrentUser();
  if (!hasSupabase() || !user) {
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

  const supabase = await getServerClient();

  const { data: existing } = await supabase
    .from("applications")
    .select("id")
    .eq("user_id", user.id)
    .eq("job_id", jobId)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "Already applied to this job" }, { status: 409 });
  }

  const { data, error } = await supabase
    .from("applications")
    .insert({
      user_id: user.id,
      job_id: jobId,
      cv_id: cvId || null,
      auto_applied: autoApplied,
      status: "applied",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ application: data, mode: "supabase" }, { status: 201 });
}

// GET /api/apply — list the current user's applications
export async function GET() {
  const user = await getCurrentUser();
  if (!hasSupabase() || !user) {
    return NextResponse.json({
      applications: [],
      mode: "local",
      message: "Read from localStorage on the client.",
    });
  }

  const supabase = await getServerClient();
  const { data, error } = await supabase
    .from("applications")
    .select("*, jobs(*), cvs(id, label, pdf_url, is_master)")
    .eq("user_id", user.id)
    .order("applied_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ applications: data, mode: "supabase" });
}
