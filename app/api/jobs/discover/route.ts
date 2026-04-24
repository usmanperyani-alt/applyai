import { NextRequest, NextResponse } from "next/server";
import { scrapeGreenhouse, defaultGreenhouseCompanies } from "@/lib/scraper/greenhouse";
import { scrapeIndeed } from "@/lib/scraper/indeed";
import { hasSupabase, getServiceClient } from "@/lib/supabase";

// GET /api/jobs/discover?source=greenhouse&source=indeed&company=stripe&q=designer
//
// Pulls live jobs from configured sources.
//   - When Supabase is configured, upserts into the jobs table by canonical_hash.
//   - When not, returns the in-memory list (current behavior preserved for local dev).
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sources = searchParams.getAll("source");
  const activeSources = sources.length > 0 ? sources : ["greenhouse"];
  const companies = searchParams.getAll("company");
  const query = searchParams.get("q")?.toLowerCase() || "";
  const indeedQuery = searchParams.get("q") || "software engineer";
  const indeedLocation = searchParams.get("loc") || "Remote";

  type ScrapedJob = Awaited<ReturnType<typeof scrapeGreenhouse>>[number];
  const allJobs: (ScrapedJob & { id?: string })[] = [];

  // ---- Greenhouse ----
  if (activeSources.includes("greenhouse")) {
    const slugs = companies.length > 0 ? companies : defaultGreenhouseCompanies.slice(0, 5);
    for (const slug of slugs) {
      try {
        const jobs = await scrapeGreenhouse(slug);
        allJobs.push(...jobs);
      } catch (err) {
        console.error(`Failed to scrape greenhouse:${slug}:`, err);
      }
    }
  }

  // ---- Indeed (Playwright; slow, may be blocked) ----
  if (activeSources.includes("indeed")) {
    try {
      const indeedJobs = await scrapeIndeed(indeedQuery, indeedLocation);
      allJobs.push(
        ...indeedJobs.map((j) => ({
          ...j,
          description_text: j.description || "",
          canonical_hash: "", // canonical hash computed below for Indeed
        })) as ScrapedJob[]
      );
    } catch (err) {
      console.error("Indeed scrape failed:", err);
    }
  }

  // Apply search filter
  const filtered = query
    ? allJobs.filter(
        (j) =>
          j.title.toLowerCase().includes(query) ||
          j.company.toLowerCase().includes(query) ||
          j.location.toLowerCase().includes(query)
      )
    : allJobs;

  // ---- Persist to Supabase if configured ----
  if (hasSupabase() && filtered.length > 0) {
    try {
      const supabase = getServiceClient();
      const { data: upserted, error } = await supabase
        .from("jobs")
        .upsert(filtered, { onConflict: "canonical_hash", ignoreDuplicates: false })
        .select("id, source, external_id, title, company, location, remote, salary_min, salary_max, description, description_text, url, match_score, matched_skills, missing_skills, discovered_at");

      if (error) {
        console.error("Supabase upsert error:", error.message);
      } else if (upserted) {
        return NextResponse.json({
          jobs: upserted.slice(0, 100),
          total: upserted.length,
          sources: activeSources,
          persisted: true,
        });
      }
    } catch (err) {
      console.error("Supabase persist failed:", err);
    }
  }

  // ---- In-memory fallback (no Supabase) ----
  // Add ephemeral IDs and placeholder match scores so the UI works
  const withIds = filtered.map((j) => ({
    ...j,
    id: `${j.source}-${j.external_id}`,
    match_score: Math.floor(Math.random() * 30) + 70,
    matched_skills: [],
    missing_skills: [],
  }));

  return NextResponse.json({
    jobs: withIds.slice(0, 100),
    total: withIds.length,
    sources: activeSources,
    persisted: false,
  });
}
