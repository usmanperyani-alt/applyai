import { NextRequest, NextResponse } from "next/server";
import { applyToGreenhouse, detectATS, type ApplicantInfo } from "@/lib/autoApply/greenhouse";
import { hasSupabase, getServiceClient } from "@/lib/supabase";

// POST /api/auto-apply/submit
//   body: { jobUrl, applicant: ApplicantInfo, confirmed: true, jobId?, userId?, cvId? }
//
// Actually submits the application. The `confirmed: true` flag is required —
// keeps a guard against accidental submission via misconfigured callers.
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { jobUrl, applicant, confirmed, jobId, userId, cvId } = body as {
    jobUrl?: string;
    applicant?: ApplicantInfo;
    confirmed?: boolean;
    jobId?: string;
    userId?: string;
    cvId?: string;
  };

  if (!confirmed) {
    return NextResponse.json(
      { error: "Must set confirmed: true to actually submit" },
      { status: 400 }
    );
  }
  if (!jobUrl || !applicant) {
    return NextResponse.json({ error: "jobUrl and applicant required" }, { status: 400 });
  }

  const ats = detectATS(jobUrl);
  if (ats !== "greenhouse") {
    return NextResponse.json({ error: `Unsupported ATS: ${ats}` }, { status: 400 });
  }

  const result = await applyToGreenhouse(jobUrl, applicant, { dryRun: false });

  // Record the application if Supabase is configured
  if (result.success && hasSupabase() && userId && jobId) {
    try {
      const supabase = getServiceClient();
      await supabase.from("applications").insert({
        user_id: userId,
        job_id: jobId,
        cv_id: cvId || null,
        auto_applied: true,
        status: "applied",
        submission_log: {
          submitted_at: new Date().toISOString(),
          ats,
          success_indicator: result.message,
          filled_fields: result.filledFields,
        },
      });
    } catch (err) {
      console.error("Failed to log application:", err);
    }
  }

  return NextResponse.json({
    ats,
    success: result.success,
    message: result.message,
    filledFields: result.filledFields,
  });
}
