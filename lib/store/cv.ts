"use client";

import type { CVContent } from "@/types";
import { getBrowserClient } from "@/lib/supabase/browser";

/**
 * Master-CV store. Tries Supabase when the user is signed in,
 * falls back to localStorage. Always caches in localStorage for fast
 * subsequent loads — Supabase is a refresh.
 *
 * The CV editor calls these and doesn't need to know which backend won.
 */

const CV_KEY = "masterCV";
const CV_ID_KEY = "masterCVId";
const CV_TEXT_KEY = "cvExtractedText";

const supabaseConfigured = () =>
  typeof window !== "undefined" &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function getUserId(): Promise<string | null> {
  if (!supabaseConfigured()) return null;
  const { data } = await getBrowserClient().auth.getUser();
  return data.user?.id ?? null;
}

export interface LoadedCV {
  id: string | null;       // null in local mode, otherwise the cvs.id
  content: CVContent;
}

const emptyCV: CVContent = {
  summary: "",
  experience: [],
  education: [],
  skills: [],
  certifications: [],
};

function readLocal(): { id: string | null; content: CVContent } | null {
  try {
    const raw = localStorage.getItem(CV_KEY);
    if (!raw) return null;
    const content = JSON.parse(raw) as CVContent;
    const id = localStorage.getItem(CV_ID_KEY);
    return { id, content: { ...emptyCV, ...content } };
  } catch {
    return null;
  }
}

function writeLocal(content: CVContent, id: string | null): void {
  try {
    localStorage.setItem(CV_KEY, JSON.stringify(content));
    if (id) localStorage.setItem(CV_ID_KEY, id);
    else localStorage.removeItem(CV_ID_KEY);
  } catch {
    // quota exceeded or private browsing — ignore
  }
}

/**
 * Load the master CV. If signed in: prefer Supabase. If Supabase has nothing
 * but localStorage does, push the local copy up (one-time migration), then
 * return it. If signed out: read from localStorage only.
 */
export async function loadMasterCV(): Promise<LoadedCV | null> {
  const userId = await getUserId();

  if (!userId) {
    return readLocal();
  }

  const supabase = getBrowserClient();
  const { data, error } = await supabase
    .from("cvs")
    .select("id, content")
    .eq("user_id", userId)
    .eq("is_master", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("loadMasterCV: Supabase error, falling back to local:", error.message);
    return readLocal();
  }

  if (data) {
    const content = { ...emptyCV, ...(data.content as CVContent) };
    writeLocal(content, data.id);
    return { id: data.id, content };
  }

  // Nothing in Supabase yet — migrate from localStorage if present.
  const local = readLocal();
  if (local && (local.content.summary || local.content.experience.length > 0 || local.content.skills.length > 0)) {
    const saved = await saveMasterCV(local.content);
    return saved;
  }

  return null;
}

/**
 * Persist the master CV. When signed in, upserts the cvs row (one master per
 * user). Always writes to localStorage as cache.
 *
 * Returns the cv id (null if local-only) so the caller can later link an
 * application back to this CV.
 */
export async function saveMasterCV(content: CVContent): Promise<LoadedCV> {
  // Always cache locally first — UI stays responsive even if network is slow.
  const cachedId = (() => {
    try { return localStorage.getItem(CV_ID_KEY); } catch { return null; }
  })();
  writeLocal(content, cachedId);

  const userId = await getUserId();
  if (!userId) {
    return { id: null, content };
  }

  const supabase = getBrowserClient();

  // Find the existing master row (if any).
  const { data: existing } = await supabase
    .from("cvs")
    .select("id")
    .eq("user_id", userId)
    .eq("is_master", true)
    .limit(1)
    .maybeSingle();

  if (existing) {
    const { data, error } = await supabase
      .from("cvs")
      .update({ content, updated_at: new Date().toISOString() })
      .eq("id", existing.id)
      .select("id")
      .single();
    if (error) {
      console.error("saveMasterCV update error:", error.message);
      return { id: cachedId, content };
    }
    writeLocal(content, data.id);
    return { id: data.id, content };
  }

  const { data, error } = await supabase
    .from("cvs")
    .insert({
      user_id: userId,
      label: "Master CV",
      content,
      is_master: true,
    })
    .select("id")
    .single();

  if (error) {
    console.error("saveMasterCV insert error:", error.message);
    return { id: cachedId, content };
  }

  writeLocal(content, data.id);
  return { id: data.id, content };
}

/**
 * Wipe the master CV everywhere. Tailored variants stay — they belong to
 * specific applications and shouldn't disappear with a master clear.
 */
export async function clearMasterCV(): Promise<void> {
  try {
    localStorage.removeItem(CV_KEY);
    localStorage.removeItem(CV_ID_KEY);
    localStorage.removeItem(CV_TEXT_KEY);
  } catch {
    // ignore
  }

  const userId = await getUserId();
  if (!userId) return;

  const supabase = getBrowserClient();
  await supabase
    .from("cvs")
    .delete()
    .eq("user_id", userId)
    .eq("is_master", true);
}

/** Convenience read for the cached cv_id without a network call. */
export function getCachedMasterCVId(): string | null {
  if (typeof window === "undefined") return null;
  try { return localStorage.getItem(CV_ID_KEY); } catch { return null; }
}
