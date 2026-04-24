/**
 * BullMQ worker that scans job boards on a schedule.
 *
 * Run standalone: npx tsx workers/jobScanner.ts
 * Requires REDIS_URL environment variable.
 */
import { Worker, Queue } from "bullmq";
import { scrapeGreenhouse, defaultGreenhouseCompanies } from "../lib/scraper/greenhouse";
import { scrapeIndeed } from "../lib/scraper/indeed";
import { scrapeLinkedIn } from "../lib/scraper/linkedin";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

const connection = {
  url: REDIS_URL,
};

const QUEUE_NAME = "job-scan";

// Create the queue (used to add jobs)
export const scanQueue = new Queue(QUEUE_NAME, { connection });

interface ScanJobData {
  sources: string[];
  query?: string;
  location?: string;
  greenhouseCompanies?: string[];
}

// Create the worker
const worker = new Worker<ScanJobData>(
  QUEUE_NAME,
  async (job) => {
    const { sources, query = "Product Designer", location = "Remote", greenhouseCompanies } = job.data;
    const results: { source: string; count: number; error?: string }[] = [];

    for (const source of sources) {
      try {
        let jobs;

        switch (source) {
          case "greenhouse": {
            const companies = greenhouseCompanies || defaultGreenhouseCompanies;
            const allJobs = [];
            for (const company of companies) {
              const companyJobs = await scrapeGreenhouse(company);
              allJobs.push(...companyJobs);
              // Rate limit between companies
              await sleep(1000);
            }
            jobs = allJobs;
            break;
          }
          case "indeed":
            jobs = await scrapeIndeed(query, location);
            break;
          case "linkedin":
            jobs = await scrapeLinkedIn(query, location);
            break;
          default:
            results.push({ source, count: 0, error: `Unknown source: ${source}` });
            continue;
        }

        // TODO: Upsert jobs into Supabase via API
        // For now, just log the count
        console.log(`[${source}] Found ${jobs.length} jobs`);
        results.push({ source, count: jobs.length });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[${source}] Error: ${message}`);
        results.push({ source, count: 0, error: message });
      }
    }

    return results;
  },
  { connection }
);

worker.on("completed", (job, result) => {
  console.log(`Scan job ${job.id} completed:`, result);
});

worker.on("failed", (job, err) => {
  console.error(`Scan job ${job?.id} failed:`, err.message);
});

console.log("Job scanner worker started. Waiting for jobs...");

// Schedule recurring scan every 30 minutes
async function scheduleRecurringScan() {
  await scanQueue.upsertJobScheduler(
    "recurring-scan",
    { every: 30 * 60 * 1000 }, // 30 minutes
    {
      data: {
        sources: ["greenhouse", "indeed", "linkedin"],
      },
    }
  );
  console.log("Scheduled recurring scan every 30 minutes");
}

scheduleRecurringScan().catch(console.error);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
