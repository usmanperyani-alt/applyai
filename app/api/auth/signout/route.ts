import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  if (hasSupabase()) {
    const supabase = await getServerClient();
    await supabase.auth.signOut();
  }
  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}
