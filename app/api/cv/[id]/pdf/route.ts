import { NextResponse } from "next/server";
import { hasSupabase } from "@/lib/supabase";
import { getCurrentUser, getServerClient, getServiceClient } from "@/lib/supabase/server";

// GET /api/cv/<cv_id>/pdf?download=1
//
// Streams the saved PDF, or with `download=1` forces a download header.
// RLS gates the cv row read; the storage object is fetched by the service
// client from the path stored on that row.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const url = new URL(req.url);
  const forceDownload = url.searchParams.get("download") === "1";

  if (!hasSupabase()) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const userClient = await getServerClient();
  const { data: cvRow, error } = await userClient
    .from("cvs")
    .select("id, label, pdf_url")
    .eq("id", id)
    .single();

  if (error || !cvRow) {
    return NextResponse.json({ error: "CV not found" }, { status: 404 });
  }
  if (!cvRow.pdf_url) {
    return NextResponse.json({ error: "No PDF generated for this CV yet" }, { status: 404 });
  }

  const service = getServiceClient();
  const { data: file, error: dlErr } = await service.storage
    .from("cv-pdfs")
    .download(cvRow.pdf_url);

  if (dlErr || !file) {
    return NextResponse.json({ error: "PDF missing from storage" }, { status: 404 });
  }

  const buf = new Uint8Array(await file.arrayBuffer());
  const safeName = (cvRow.label || "cv").replace(/[^a-z0-9-_ ]/gi, "_").trim() || "cv";
  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${forceDownload ? "attachment" : "inline"}; filename="${safeName}.pdf"`,
      "Cache-Control": "private, max-age=300",
    },
  });
}
