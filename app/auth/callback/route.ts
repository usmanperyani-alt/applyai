import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase/server";

// GET /auth/callback?code=...&next=/dashboard
//
// Hit by Supabase's email confirmation / magic link flow. Exchanges the code
// for a session, sets the auth cookie, and redirects to the requested page.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/dashboard";

  if (code) {
    const supabase = await getServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=callback_failed`);
}
