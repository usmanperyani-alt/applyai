import { createHash } from "crypto";
import type { Job } from "@/types";

interface GreenhouseJob {
  id: number;
  title: string;
  location: { name: string };
  absolute_url: string;
  content: string;
  updated_at: string;
}

interface GreenhouseResponse {
  jobs: GreenhouseJob[];
}

/**
 * Stable hash for collapsing the same posting across sources.
 * Lowercased, whitespace-normalized concatenation of company, title, location.
 */
export function canonicalHash(company: string, title: string, location: string): string {
  const normalized = [company, title, location]
    .map((s) => (s || "").toLowerCase().trim().replace(/\s+/g, " "))
    .join("||");
  return createHash("sha256").update(normalized).digest("hex");
}

/**
 * Scrape jobs from a company's Greenhouse board.
 * Greenhouse has a public JSON API — no auth or browser needed.
 */
export async function scrapeGreenhouse(
  companySlug: string
): Promise<(Omit<Job, "id" | "match_score" | "matched_skills" | "missing_skills"> & {
  description_text: string;
  canonical_hash: string;
})[]> {
  const url = `https://boards-api.greenhouse.io/v1/boards/${companySlug}/jobs?content=true`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Greenhouse API error for ${companySlug}: ${res.status}`);
  }

  const data: GreenhouseResponse = await res.json();
  const properName = companySlug.charAt(0).toUpperCase() + companySlug.slice(1);

  return data.jobs.map((job) => ({
    source: "greenhouse",
    external_id: String(job.id),
    title: job.title,
    company: properName,
    location: job.location.name,
    remote: job.location.name.toLowerCase().includes("remote"),
    salary_min: null,
    salary_max: null,
    description: sanitizeHtml(job.content),
    description_text: stripHtml(job.content),
    canonical_hash: canonicalHash(properName, job.title, job.location.name),
    url: job.absolute_url,
    discovered_at: new Date().toISOString(),
  }));
}

/** List of popular Greenhouse company slugs to scan */
export const defaultGreenhouseCompanies = [
  "stripe",
  "figma",
  "notion",
  "linear",
  "vercel",
  "airbnb",
  "coinbase",
  "databricks",
  "ramp",
  "brex",
];

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeHtml(html: string): string {
  // Allow only safe tags, strip scripts/styles/event handlers
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/\s*on\w+="[^"]*"/gi, "")
    .replace(/\s*on\w+='[^']*'/gi, "")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"');
}
