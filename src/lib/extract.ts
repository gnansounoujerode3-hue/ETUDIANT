// Extraction de texte côté client (PDF / DOCX / PPTX / TXT).
// Aucune dépendance serveur : tout s'exécute dans le navigateur.

export class ExtractError extends Error {
  code: "unsupported_format" | "pdf_failed" | "pdf_no_text" | "empty_text" | "too_large";
  constructor(code: ExtractError["code"]) {
    super(code);
    this.code = code;
  }
}

const MAX_CHARS = 1_500_000;

export async function extractTextFromFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  let text = "";
  if (file.type.startsWith("text/") || /\.(txt|md)$/.test(name)) {
    text = await file.text();
  } else if (name.endsWith(".pdf")) {
    text = await extractPdf(file);
  } else if (name.endsWith(".docx")) {
    text = await extractDocx(file);
  } else if (name.endsWith(".pptx")) {
    text = await extractPptx(file);
  } else {
    throw new ExtractError("unsupported_format");
  }
  text = text.replace(/\u0000/g, "").trim();
  if (text.length > MAX_CHARS) text = text.slice(0, MAX_CHARS);
  if (text.length < 20) throw new ExtractError("empty_text");
  return text;
}

async function extractPdf(file: File): Promise<string> {
  try {
    const pdfjs: any = await import("pdfjs-dist");
    // Le worker doit avoir exactement la même version que pdfjs. L'ancienne
    // URL CDN pointait vers PDF.js 3 alors que l'application utilise PDF.js 6,
    // ce qui faisait échouer des PDF parfaitement valides.
    // Créer explicitement le Worker est plus fiable avec Next/Webpack que de
    // fournir seulement workerSrc : dans certains builds de production,
    // PDF.js tentait sinon de charger littéralement `pdfjs-dist/...` depuis
    // le domaine du site et tous les documents échouaient avant leur lecture.
    if (!pdfjs.GlobalWorkerOptions.workerPort) {
      pdfjs.GlobalWorkerOptions.workerPort = new Worker(
        new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url),
        { type: "module" }
      );
    }

    const data = new Uint8Array(await file.arrayBuffer());
    const loadingTask = pdfjs.getDocument({
      data,
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
    });
    const doc = await loadingTask.promise;
    const pages: string[] = [];
    let totalLength = 0;

    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent({ includeMarkedContent: false });
      let pageText = "";
      let previousY: number | null = null;

      for (const item of content.items as Array<{ str?: string; hasEOL?: boolean; transform?: number[] }>) {
        if (typeof item.str !== "string" || !item.str) continue;
        const y = Array.isArray(item.transform) ? item.transform[5] : null;
        const newLine = item.hasEOL || (previousY != null && y != null && Math.abs(y - previousY) > 4);
        if (pageText && newLine) pageText += "\n";
        else if (pageText && !pageText.endsWith(" ") && !pageText.endsWith("\n")) pageText += " ";
        pageText += item.str;
        if (y != null) previousY = y;
      }

      pageText = pageText.replace(/[ \t]+\n/g, "\n").replace(/[ \t]{2,}/g, " ").trim();
      if (pageText) {
        pages.push(pageText);
        totalLength += pageText.length;
      }
      page.cleanup();
      if (totalLength > MAX_CHARS) break;
    }
    await doc.destroy();

    const extracted = pages.join("\n\n").trim();
    if (extracted.length < 20) throw new ExtractError("pdf_no_text");
    return extracted;
  } catch (error) {
    if (error instanceof ExtractError) throw error;
    throw new ExtractError("pdf_failed");
  }
}

async function extractDocx(file: File): Promise<string> {
   
  const mammoth: any = await import("mammoth");
  const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
  return String(result?.value ?? "");
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

async function extractPptx(file: File): Promise<string> {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const slideNames = Object.keys(zip.files)
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => {
      const na = Number(a.match(/slide(\d+)\.xml/)?.[1] ?? 0);
      const nb = Number(b.match(/slide(\d+)\.xml/)?.[1] ?? 0);
      return na - nb;
    });
  let out = "";
  for (const name of slideNames) {
    const xml = await zip.file(name)?.async("string");
    if (!xml) continue;
    const runs = [...xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) => decodeXmlEntities(m[1]));
    if (runs.length) out += runs.join(" ") + "\n\n";
    if (out.length > MAX_CHARS) break;
  }
  return out;
}
