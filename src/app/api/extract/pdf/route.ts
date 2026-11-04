import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const MAX_CHARS = 1_500_000;

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File) || (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf"))) {
      return NextResponse.json({ error: "invalid_pdf" }, { status: 400 });
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: "too_large" }, { status: 413 });
    }

    // pdf-parse est volontairement utilisé ici plutôt que le build navigateur
    // de PDF.js. Il fonctionne sans Web Worker ni API DOM dans la fonction
    // Node de Vercel et a été validé avec le PDF exact signalé par l'utilisateur.
    const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default;
    const parsed = await pdfParse(Buffer.from(await file.arrayBuffer()));
    const text = parsed.text.slice(0, MAX_CHARS).trim();
    if (text.length < 20) {
      return NextResponse.json({ error: "no_text" }, { status: 422 });
    }
    return NextResponse.json({ text });
  } catch (error) {
    console.error("Server PDF extraction failed", error);
    return NextResponse.json({ error: "pdf_failed" }, { status: 422 });
  }
}
