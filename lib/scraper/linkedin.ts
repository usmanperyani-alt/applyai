import { chromium, type Browser } from "playwright";
import type { Job } from "@/types";

/**
 * Scrape jobs from LinkedIn using Playwright.
 * Uses the public job search (no login required for listing pages).
 * This is the most fragile scraper — LinkedIn aggressively blocks bots.
 */
export async function scrapeLinkedIn(
  query: string,
  location: string = "Remote"
): Promise<Omit<Job, "id" | "match_score" | "matched_skills" | "missing_skills">[]> {
  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    });
    const page = await context.newPage();

    const searchUrl = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(query)}&location=${encodeURIComponent(location)}&sortBy=DD`;
    await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 30000 });

    // Wait for job list
    await page.waitForSelector(".jobs-search__results-list li", { timeout: 10000 }).catch(() => null);

    const jobs = await page.$$eval(
      ".jobs-search__results-list li",
      (items) =>
        items.slice(0, 20).map((item) => {
          const titleEl = item.querySelector(".base-search-card__title");
          const companyEl = item.querySelector(".base-search-card__subtitle a");
          const locationEl = item.querySelector(".job-search-card__location");
          const linkEl = item.querySelector("a.base-card__full-link");

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
        source: "linkedin" as const,
        external_id: job.url.split("?")[0]?.split("-").pop() || job.title.slice(0, 20),
        title: job.title,
        company: job.company,
        location: job.location,
        remote: job.location.toLowerCase().includes("remote"),
        salary_min: null,
        salary_max: null,
        description: "",
        url: job.url,
        discovered_at: new Date().toISOString(),
      }));
  } finally {
    await browser?.close();
  }
}
