"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * SSR-safe browser client. Use in client components.
 * Supabase handles single-instance reuse per tab internally.
 */
export function getBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
