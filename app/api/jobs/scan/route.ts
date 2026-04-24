import { NextRequest, NextResponse } from "next/server";

// POST /api/jobs/scan — trigger a job scan
// In production this enqueues a BullMQ job; for now returns a mock response
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const sources = body.sources || ["greenhouse"];

  // TODO: When Redis is configured, enqueue to BullMQ instead
  // const queue = new Queue("job-scan", { connection: redis });
  // await queue.add("scan", { sources });

  return NextResponse.json({
    message: "Scan enqueued",
    sources,
    status: "queued",
  });
}

// GET /api/jobs/scan — check scan status
export async function GET() {
  // TODO: Check BullMQ job status
  return NextResponse.json({
    status: "idle",
    lastRun: new Date().toISOString(),
    jobsFound: 0,
  });
}
