"use client";

import { getBrowserClient } from "@/lib/supabase/browser";

/**
 * Profile store. Mirrors lib/store/cv.ts: Supabase when authed, localStorage
 * cache always. Profile fields are flat — name, headline, skills, roles, etc.
 */

const PROFILE_KEY = "userProfile";

export interface StoredProfile {
  full_name: string;
  headline: string;
  email?: string;
  phone?: string;
  location: string;
  linkedin_url?: string;
  remote_only?: boolean;
  salary_min?: number;
  salary_max?: number;
  roles: string[];
  skills: string[];
  // Legacy fields kept for back-compat with existing UI
  name?: string;
  years_experience?: number;
  salary_estimate_min?: number;
  salary_estimate_max?: number;
}

const supabaseConfigured = () =>
  typeof window !== "undefined" &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function getUserId(): Promise<string | null> {
  if (!supabaseConfigured()) return null;
  const { data } = await getBrowserClient().auth.getUser();
  return data.user?.id ?? null;
}

const emptyProfile: StoredProfile = {
  full_name: "",
  headline: "",
  location: "",
  roles: [],
  skills: [],
};

function readLocal(): StoredProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<StoredProfile>;
    return {
      ...emptyProfile,
      ...p,
      // Migrate legacy `name` field to `full_name`
      full_name: p.full_name || p.name || "",
    };
  } catch {
    return null;
  }
}

// Cache-only: write to localStorage without dispatching profileUpdated.
// Used after a load so listeners don't re-trigger a load.
function cacheLocal(profile: StoredProfile): void {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // ignore
  }
}

// Write + notify: used by saveProfile when the user actually changed something.
function writeLocal(profile: StoredProfile): void {
  cacheLocal(profile);
  try { window.dispatchEvent(new Event("profileUpdated")); } catch { /* ignore */ }
}

export async function loadProfile(): Promise<StoredProfile | null> {
  const userId = await getUserId();
  if (!userId) return readLocal();

  const supabase = getBrowserClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("loadProfile: Supabase error:", error.message);
    return readLocal();
  }

  if (data) {
    const profile: StoredProfile = {
      ...emptyProfile,
      full_name: data.full_name || "",
      headline: data.headline || "",
      email: data.email || "",
      phone: data.phone || "",
      location: data.location || "",
      linkedin_url: data.linkedin_url || "",
      remote_only: data.remote_only || false,
      salary_min: data.salary_min || undefined,
      salary_max: data.salary_max || undefined,
      roles: data.roles || [],
      skills: data.skills || [],
    };
    cacheLocal(profile);
    return profile;
  }

  // Nothing remote — push local up if we have anything substantive
  const local = readLocal();
  if (local && (local.full_name || local.headline || local.skills.length > 0)) {
    return saveProfile(local);
  }
  return null;
}

export async function saveProfile(profile: StoredProfile): Promise<StoredProfile> {
  writeLocal(profile);

  const userId = await getUserId();
  if (!userId) return profile;

  const supabase = getBrowserClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: profile.full_name,
      headline: profile.headline,
      email: profile.email,
      phone: profile.phone,
      location: profile.location,
      linkedin_url: profile.linkedin_url,
      remote_only: profile.remote_only,
      salary_min: profile.salary_min,
      salary_max: profile.salary_max,
      roles: profile.roles,
      skills: profile.skills,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) console.error("saveProfile error:", error.message);
  return profile;
}

export async function clearProfile(): Promise<void> {
  try {
    localStorage.removeItem(PROFILE_KEY);
    window.dispatchEvent(new Event("profileUpdated"));
  } catch {
    // ignore
  }
  // We don't delete the profiles row on clear — auth user still exists.
  // Just blank the fields.
  const userId = await getUserId();
  if (!userId) return;
  const supabase = getBrowserClient();
  await supabase
    .from("profiles")
    .update({
      full_name: null,
      headline: null,
      location: null,
      roles: [],
      skills: [],
    })
    .eq("id", userId);
}
