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

    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(await file.arrayBuffer()),
    });
    const doc = await loadingTask.promise;
    const pages: string[] = [];
    let length = 0;

    for (let pageNumber = 1; pageNumber <= doc.numPages && length < MAX_CHARS; pageNumber++) {
      const page = await doc.getPage(pageNumber);
      const content = await page.getTextContent();
      const text = content.items
        .map((item) => ("str" in item ? item.str : ""))
        .filter(Boolean)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      if (text) {
        pages.push(text);
        length += text.length;
      }
      page.cleanup();
    }
    await loadingTask.destroy();

    const text = pages.join("\n\n").slice(0, MAX_CHARS).trim();
    if (text.length < 20) {
      return NextResponse.json({ error: "no_text" }, { status: 422 });
    }
    return NextResponse.json({ text });
  } catch (error) {
    console.error("Server PDF extraction failed", error);
    return NextResponse.json({ error: "pdf_failed" }, { status: 422 });
  }
}
