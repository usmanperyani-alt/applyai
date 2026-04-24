import { NextRequest, NextResponse } from "next/server";
import { scrapeGreenhouse } from "@/lib/scraper/greenhouse";

// GET /api/jobs/discover?company=stripe&company=figma...
// Pulls live jobs from Greenhouse public API — no keys needed
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const companies = searchParams.getAll("company");
  const query = searchParams.get("q")?.toLowerCase() || "";

  const slugs = companies.length > 0
    ? companies
    : ["stripe", "figma", "notion", "linear", "vercel"];

  const allJobs = [];

  for (const slug of slugs) {
    try {
      const jobs = await scrapeGreenhouse(slug);
      // Map company slug to proper name
      const properName = slug.charAt(0).toUpperCase() + slug.slice(1);
      allJobs.push(
        ...jobs.map((j) => ({
          ...j,
          company: properName,
          id: `${j.source}-${j.external_id}`,
          match_score: Math.floor(Math.random() * 30) + 70, // placeholder score
          matched_skills: [],
          missing_skills: [],
        }))
      );
    } catch (err) {
      console.error(`Failed to scrape ${slug}:`, err);
    }
  }

  // Filter by search query if provided
  const filtered = query
    ? allJobs.filter(
        (j) =>
          j.title.toLowerCase().includes(query) ||
          j.company.toLowerCase().includes(query) ||
          j.location.toLowerCase().includes(query)
      )
    : allJobs;

  return NextResponse.json({
    jobs: filtered.slice(0, 100),
    total: filtered.length,
    sources: slugs,
  });
}
