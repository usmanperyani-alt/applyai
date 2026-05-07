import "server-only";
import { cookies } from "next/headers";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { hasSupabase } from "@/lib/supabase";

/**
 * Per-request server client. Reads the auth cookie set by the browser
 * client / proxy and presents the user's session to RLS.
 * Use in server components, route handlers, and server actions.
 */
export async function getServerClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // In Server Components cookies() is read-only and these calls throw.
          // The proxy handles session refresh, so we can swallow here safely.
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // ignore — happens in Server Components, expected
          }
        },
      },
    }
  );
}

/**
 * Returns the authenticated user for the current request, or null.
 */
export async function getCurrentUser() {
  if (!hasSupabase()) return null;
  const supabase = await getServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}

/**
 * Service-role client — bypasses RLS. Use only for cross-user operations:
 *   - scraping the shared `jobs` table
 *   - admin tasks
 * Never expose to the browser.
 */
let _serviceClient: SupabaseClient | null = null;
export function getServiceClient() {
  if (!_serviceClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceRoleKey) {
      throw new Error(
        "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
      );
    }
    _serviceClient = createClient(url, serviceRoleKey, {
      auth: { persistSession: false },
    });
  }
  return _serviceClient;
}
