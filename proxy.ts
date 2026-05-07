import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Pages that don't require auth. Everything else gets redirected to /login
// when the user has no session.
const PUBLIC_PATHS = ["/login", "/auth"];

// Next.js 16 renamed middleware to proxy. Same lifecycle, runs before every
// matched request. We use it to (a) refresh the Supabase auth cookie so the
// user's session stays valid in Server Components, and (b) gate routes.
export async function proxy(request: NextRequest) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // No-op when Supabase isn't configured — app runs in fully local mode.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  // IMPORTANT: getUser() must be called for the cookie refresh side-effect.
  const { data: { user } } = await supabase.auth.getUser();

  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));

  if (!user && !isPublic) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Onboarding gate: signed-in users without `onboarding_completed_at` get
  // pushed to the appropriate /onboarding step. Skip /onboarding/* itself
  // (otherwise infinite loop) and skip /auth/* (logout etc must work mid-flow).
  if (
    user &&
    !pathname.startsWith("/onboarding") &&
    !pathname.startsWith("/auth") &&
    !pathname.startsWith("/api")
  ) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_step, onboarding_completed_at")
      .eq("id", user.id)
      .maybeSingle();

    if (profile && !profile.onboarding_completed_at) {
      const steps = ["welcome", "cv", "preferences", "scan"];
      const idx = Math.min(profile.onboarding_step ?? 0, steps.length - 1);
      return NextResponse.redirect(new URL(`/onboarding/${steps[idx]}`, request.url));
    }
  }

  return response;
}

export const config = {
  // Run on every request EXCEPT static assets, _next internals, and API routes.
  // API routes do their own auth check via getCurrentUser() so we keep them
  // out of the proxy to avoid cookie-setting churn on every fetch.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
