/**
 * Universal Supabase entry — exports only environment helpers that are safe
 * in both server and client bundles.
 *
 * For actual clients:
 *   - Client components: import from "@/lib/supabase/browser"
 *   - Server code (route handlers, server components, server actions, proxy):
 *     import from "@/lib/supabase/server"
 *
 * The split prevents `next/headers` (server-only) from leaking into client
 * bundles via the SSR client.
 */

export function hasSupabase(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
