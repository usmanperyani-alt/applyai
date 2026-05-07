import { NextRequest, NextResponse } from "next/server";
import { tailorCVForJob } from "@/lib/cv/tailor";
import { generatePDF, type CVHeader } from "@/lib/cv/pdf";
import { hasAIProvider } from "@/lib/anthropic";
import { hasSupabase } from "@/lib/supabase";
import { getCurrentUser, getServerClient, getServiceClient } from "@/lib/supabase/server";
import type { CVContent } from "@/types";

// POST /api/cv/tailor-and-save
//   body: { cv: CVContent, job: { id?, title, company, description }, header?: CVHeader }
//
// One-shot: tailor → save tailored CV row → generate PDF → upload to Storage
// → return { cvId, pdfUrl, tailoredContent, changes }.
//
// The PDF goes to bucket `cv-pdfs` at path `<user_id>/<cv_id>.pdf`. The
// row's `pdf_url` stores the relative path; the client gets a signed URL
// when downloading later.
export async function POST(req: NextRequest) {
  if (!hasAIProvider()) {
    return NextResponse.json(
      { error: "No AI provider configured. Set ZAI_API_KEY or ANTHROPIC_API_KEY." },
      { status: 503 }
    );
  }

  const body = await req.json();
  const { cv, job, header } = body as {
    cv: CVContent;
    job: { id?: string; title: string; company: string; description: string };
    header?: CVHeader;
  };

  if (!cv || !job?.title || !job?.company) {
    return NextResponse.json({ error: "cv, job.title, job.company required" }, { status: 400 });
  }

  // 1. AI tailor
  const { tailored, changes } = await tailorCVForJob(cv, {
    title: job.title,
    company: job.company,
    description: job.description || "",
  });

  // 2. If unauthenticated or Supabase off, return tailored content without persisting.
  if (!hasSupabase()) {
    return NextResponse.json({
      cvId: null,
      pdfUrl: null,
      tailoredContent: tailored,
      changes,
      mode: "local",
    });
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({
      cvId: null,
      pdfUrl: null,
      tailoredContent: tailored,
      changes,
      mode: "anonymous",
    });
  }

  // 3. Save tailored CV row (under the user's session, RLS-aware).
  // Only attach tailored_for_job_id if it's a real UUID — synthetic ids
  // like "greenhouse-12345" come from the in-memory fallback path of the
  // discover route and would crash the uuid column.
  const isUuid = (s: string | undefined): boolean =>
    !!s && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

  const userClient = await getServerClient();
  const { data: cvRow, error: cvErr } = await userClient
    .from("cvs")
    .insert({
      user_id: user.id,
      label: `Tailored for ${job.company} — ${job.title}`,
      content: tailored,
      is_master: false,
      tailored_for_job_id: isUuid(job.id) ? job.id : null,
    })
    .select("id")
    .single();

  if (cvErr || !cvRow) {
    console.error("tailor-and-save: cv insert error:", cvErr);
    return NextResponse.json({ error: cvErr?.message || "Failed to save CV" }, { status: 500 });
  }

  const cvId = cvRow.id as string;

  // 4. Generate PDF + upload to Storage.
  let pdfUrl: string | null = null;
  try {
    const pdfBuffer = await generatePDF(tailored, header || {});
    const path = `${user.id}/${cvId}.pdf`;
    // Use the service client for the storage write — RLS-bypass keeps this
    // simple, and we control the path so it always belongs to the user.
    const service = getServiceClient();
    const { error: uploadErr } = await service.storage
      .from("cv-pdfs")
      .upload(path, new Uint8Array(pdfBuffer), {
        contentType: "application/pdf",
        upsert: true,
      });
    if (uploadErr) {
      console.error("tailor-and-save: PDF upload error:", uploadErr);
    } else {
      pdfUrl = path;
      // Persist the path on the CV row so we can find it later.
      await userClient.from("cvs").update({ pdf_url: pdfUrl }).eq("id", cvId);
    }
  } catch (err) {
    console.error("tailor-and-save: PDF generation failed:", err);
  }

  return NextResponse.json({
    cvId,
    pdfUrl,
    tailoredContent: tailored,
    changes,
    mode: "supabase",
  });
}
