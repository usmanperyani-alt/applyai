import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

// GET /api/jobs — list jobs with optional filters
export async function GET(req: NextRequest) {
  const supabase = getServiceClient();
  const { searchParams } = new URL(req.url);

  const source = searchParams.get("source");
  const minScore = searchParams.get("min_score");
  const remote = searchParams.get("remote");
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = parseInt(searchParams.get("offset") || "0");

  let query = supabase
    .from("jobs")
    .select("*", { count: "exact" })
    .order("discovered_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (source) query = query.eq("source", source);
  if (minScore) query = query.gte("match_score", parseInt(minScore));
  if (remote === "true") query = query.eq("remote", true);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ jobs: data, total: count });
}

// POST /api/jobs — upsert a discovered job
export async function POST(req: NextRequest) {
  const supabase = getServiceClient();
  const body = await req.json();

  const { data, error } = await supabase
    .from("jobs")
    .upsert(body, { onConflict: "source,external_id" })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ job: data }, { status: 201 });
}
