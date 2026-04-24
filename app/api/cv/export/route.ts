import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { generatePDF } from "@/lib/cv/pdf";

// GET /api/cv/export?cvId=... — generate and download PDF
export async function GET(req: NextRequest) {
  const cvId = new URL(req.url).searchParams.get("cvId");

  if (!cvId) {
    return NextResponse.json({ error: "cvId is required" }, { status: 400 });
  }

  const supabase = getServiceClient();

  const { data: cv, error } = await supabase
    .from("cvs")
    .select("*")
    .eq("id", cvId)
    .single();

  if (error || !cv) {
    return NextResponse.json({ error: "CV not found" }, { status: 404 });
  }

  const pdfBuffer = await generatePDF(cv.content);

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="cv-${cv.label || "tailored"}.pdf"`,
    },
  });
}
