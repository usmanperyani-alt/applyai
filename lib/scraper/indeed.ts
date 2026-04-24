import { chromium, type Browser } from "playwright";
import type { Job } from "@/types";

/**
 * Scrape jobs from Indeed using Playwright.
 * This is fragile and rate-limited — use sparingly.
 */
export async function scrapeIndeed(
  query: string,
  location: string = "Remote"
): Promise<Omit<Job, "id" | "match_score" | "matched_skills" | "missing_skills">[]> {
  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    const searchUrl = `https://www.indeed.com/jobs?q=${encodeURIComponent(query)}&l=${encodeURIComponent(location)}&sort=date`;
    await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 30000 });

    // Wait for job cards to load
    await page.waitForSelector(".job_seen_beacon", { timeout: 10000 }).catch(() => null);

    const jobs = await page.$$eval(".job_seen_beacon", (cards) =>
      cards.slice(0, 20).map((card) => {
        const titleEl = card.querySelector("h2.jobTitle a, h2.jobTitle span");
        const companyEl = card.querySelector("[data-testid='company-name']");
        const locationEl = card.querySelector("[data-testid='text-location']");
        const linkEl = card.querySelector("h2.jobTitle a");

        return {
          title: titleEl?.textContent?.trim() || "",
          company: companyEl?.textContent?.trim() || "",
          location: locationEl?.textContent?.trim() || "",
          url: linkEl?.getAttribute("href") || "",
        };
      })
    );

    return jobs
      .filter((j) => j.title && j.company)
      .map((job) => ({
        source: "indeed" as const,
        external_id: job.url.split("jk=")[1]?.split("&")[0] || job.title.slice(0, 20),
        title: job.title,
        company: job.company,
        location: job.location,
        remote: job.location.toLowerCase().includes("remote"),
        salary_min: null,
        salary_max: null,
        description: "",
        url: job.url.startsWith("http")
          ? job.url
          : `https://www.indeed.com${job.url}`,
        discovered_at: new Date().toISOString(),
      }));
  } finally {
    await browser?.close();
  }
}
