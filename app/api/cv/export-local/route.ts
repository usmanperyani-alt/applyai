import { NextRequest, NextResponse } from "next/server";
import { generatePDF } from "@/lib/cv/pdf";
import type { CVContent } from "@/types";

// POST /api/cv/export-local — accepts CV content in the body, returns PDF
// Used when there's no Supabase / no saved cvId.
export async function POST(req: NextRequest) {
  let content: CVContent;
  try {
    const body = await req.json();
    content = body.content as CVContent;
    if (!content || !content.experience) {
      return NextResponse.json(
        { error: "Invalid CV content. Expected { content: CVContent }." },
        { status: 400 }
      );
    }
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const pdfBuffer = await generatePDF(content);
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="cv.pdf"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "PDF generation failed";
    return NextResponse.json(
      {
        error: `PDF generation failed: ${message}`,
        hint: "Ensure Puppeteer's Chromium is installed: npx puppeteer browsers install chrome",
      },
      { status: 500 }
    );
  }
}
