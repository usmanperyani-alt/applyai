import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, getServerClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase";

// GET /api/cv — list the current user's CVs (master + tailored variants).
export async function GET() {
  const user = await getCurrentUser();
  if (!hasSupabase() || !user) {
    return NextResponse.json({ cvs: [], mode: "local" });
  }

  const supabase = await getServerClient();
  const { data, error } = await supabase
    .from("cvs")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ cvs: data, mode: "supabase" });
}

// POST /api/cv — create a CV. body: { label, content, is_master?, tailored_for_job_id? }
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!hasSupabase() || !user) {
    return NextResponse.json(
      { error: "Sign in to save your CV to the cloud" },
      { status: 401 }
    );
  }

  const body = await req.json();
  const { label, content, is_master = false, tailored_for_job_id = null } = body;

  if (!content) {
    return NextResponse.json({ error: "content is required" }, { status: 400 });
  }

  const supabase = await getServerClient();

  // If saving a master CV, demote any existing master so there's only one.
  if (is_master) {
    await supabase
      .from("cvs")
      .update({ is_master: false })
      .eq("user_id", user.id)
      .eq("is_master", true);
  }

  const { data, error } = await supabase
    .from("cvs")
    .insert({
      user_id: user.id,
      label: label || (is_master ? "Master CV" : "Untitled CV"),
      content,
      is_master,
      tailored_for_job_id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ cv: data }, { status: 201 });
}

// PUT /api/cv?id=... — update content/label of an existing CV.
export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!hasSupabase() || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const body = await req.json();
  const { label, content } = body;
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (label !== undefined) update.label = label;
  if (content !== undefined) update.content = content;

  const supabase = await getServerClient();
  const { data, error } = await supabase
    .from("cvs")
    .update(update)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ cv: data });
}

// DELETE /api/cv?id=...
export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!hasSupabase() || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const supabase = await getServerClient();
  const { error } = await supabase
    .from("cvs")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
