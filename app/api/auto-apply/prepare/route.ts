import { NextRequest, NextResponse } from "next/server";
import { applyToGreenhouse, detectATS, type ApplicantInfo } from "@/lib/autoApply/greenhouse";

// POST /api/auto-apply/prepare
//   body: { jobUrl, applicant: ApplicantInfo }
//
// Fills the application form in a headless browser and returns a screenshot
// for the user to review. Does NOT submit. Use /api/auto-apply/submit to confirm.
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { jobUrl, applicant } = body as { jobUrl?: string; applicant?: ApplicantInfo };

  if (!jobUrl) {
    return NextResponse.json({ error: "jobUrl is required" }, { status: 400 });
  }
  if (!applicant?.firstName || !applicant?.email) {
    return NextResponse.json(
      { error: "applicant.firstName and applicant.email are required" },
      { status: 400 }
    );
  }
  if (!applicant.resumePath) {
    return NextResponse.json(
      { error: "applicant.resumePath (path to resume PDF on server) is required" },
      { status: 400 }
    );
  }

  const ats = detectATS(jobUrl);
  if (ats !== "greenhouse") {
    return NextResponse.json(
      {
        error: `Unsupported ATS: ${ats}. Only greenhouse is wired up so far.`,
        supportedATS: ["greenhouse"],
      },
      { status: 400 }
    );
  }

  const result = await applyToGreenhouse(jobUrl, applicant, { dryRun: true });

  return NextResponse.json({
    ats,
    success: result.success,
    message: result.message,
    screenshot: result.screenshot,
    filledFields: result.filledFields,
    unfilledRequiredFields: result.unfilledRequiredFields,
    /** Echo the input so /submit can re-run with the same params */
    submitPayload: { jobUrl, applicant },
  });
}
