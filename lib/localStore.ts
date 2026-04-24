/**
 * Typed wrappers around localStorage so keys aren't scattered as strings.
 * Returns null/empty defaults on the server (no `window`).
 */

const KEY_PROFILE = "userProfile";
const KEY_APPLIED = "appliedIds";
const KEY_USER_ID = "userId";

export interface StoredProfile {
  name: string;
  headline: string;
  skills: string[];
  roles: string[];
  location: string;
  years_experience: number;
  email?: string;
  phone?: string;
  salary_estimate_min?: number;
  salary_estimate_max?: number;
}

const isBrowser = () => typeof window !== "undefined";

export function getProfile(): StoredProfile | null {
  if (!isBrowser()) return null;
  const raw = localStorage.getItem(KEY_PROFILE);
  if (!raw) return null;
  try { return JSON.parse(raw) as StoredProfile; } catch { return null; }
}

export function setProfile(profile: StoredProfile): void {
  if (!isBrowser()) return;
  localStorage.setItem(KEY_PROFILE, JSON.stringify(profile));
  window.dispatchEvent(new Event("profileUpdated"));
}

export function clearProfile(): void {
  if (!isBrowser()) return;
  localStorage.removeItem(KEY_PROFILE);
  window.dispatchEvent(new Event("profileUpdated"));
}

export function getAppliedIds(): Set<string> {
  if (!isBrowser()) return new Set();
  const raw = localStorage.getItem(KEY_APPLIED);
  if (!raw) return new Set();
  try { return new Set(JSON.parse(raw) as string[]); } catch { return new Set(); }
}

export function setAppliedIds(ids: Set<string>): void {
  if (!isBrowser()) return;
  localStorage.setItem(KEY_APPLIED, JSON.stringify([...ids]));
}

export function addAppliedId(id: string): Set<string> {
  const current = getAppliedIds();
  current.add(id);
  setAppliedIds(current);
  return current;
}

/**
 * Returns a stable per-browser user ID. Generated on first call, persisted.
 * Used as the user_id for Supabase writes when no auth is wired up yet.
 */
export function getOrCreateUserId(): string {
  if (!isBrowser()) return "00000000-0000-0000-0000-000000000000";
  let id = localStorage.getItem(KEY_USER_ID);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY_USER_ID, id);
  }
  return id;
}

/**
 * Local applications store — used as fallback when Supabase isn't configured.
 * Each entry mirrors the shape of an applications row (minus user_id).
 */
const KEY_LOCAL_APPS = "localApplications";

export interface LocalApplication {
  id: string; // job id
  job_id: string;
  cv_id: string | null;
  status: "applied" | "viewed" | "screening" | "interview" | "offer" | "rejected";
  applied_at: string;
  auto_applied: boolean;
  // denormalized job snapshot for the Applications list
  job_snapshot: {
    title: string;
    company: string;
    location: string;
    match_score: number;
    url: string;
  };
}

export function getLocalApplications(): LocalApplication[] {
  if (!isBrowser()) return [];
  const raw = localStorage.getItem(KEY_LOCAL_APPS);
  if (!raw) return [];
  try { return JSON.parse(raw) as LocalApplication[]; } catch { return []; }
}

export function addLocalApplication(app: LocalApplication): void {
  if (!isBrowser()) return;
  const apps = getLocalApplications();
  if (apps.find((a) => a.job_id === app.job_id)) return;
  apps.unshift(app);
  localStorage.setItem(KEY_LOCAL_APPS, JSON.stringify(apps));
}
