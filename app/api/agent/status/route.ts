import { NextResponse } from "next/server";

// GET /api/agent/status — agent heartbeat / status check
export async function GET() {
  // TODO: Check actual BullMQ worker status and Redis connection
  return NextResponse.json({
    status: "active",
    lastScan: new Date().toISOString(),
    jobsScannedToday: 148,
    activeSources: ["linkedin", "indeed", "greenhouse", "lever"],
    nextScanIn: "26 min",
  });
}
