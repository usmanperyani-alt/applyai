import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, getServerClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase";

// GET /api/profile — returns the current user's profile, or null if signed out.
export async function GET() {
  const user = await getCurrentUser();
  if (!hasSupabase() || !user) {
    return NextResponse.json({ profile: null, mode: "local" });
  }

  const supabase = await getServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profile: data, mode: "supabase" });
}

// PUT /api/profile — upsert the current user's profile.
// Trigger creates the row at signup; this just updates fields.
export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!hasSupabase() || !user) {
    return NextResponse.json(
      { error: "Sign in to save your profile to the cloud" },
      { status: 401 }
    );
  }

  const body = await req.json();
  // Whitelist updatable columns so the client can't set id/embedding/etc.
  const allowed = (({
    full_name, headline, email, phone, linkedin_url, location,
    remote_only, salary_min, salary_max, roles, skills,
  }) => ({
    full_name, headline, email, phone, linkedin_url, location,
    remote_only, salary_min, salary_max, roles, skills,
    updated_at: new Date().toISOString(),
  }))(body);

  const supabase = await getServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .update(allowed)
    .eq("id", user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profile: data });
}
