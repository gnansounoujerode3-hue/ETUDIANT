// Extraction de texte côté client (PDF / DOCX / PPTX / TXT).
// Aucune dépendance serveur : tout s'exécute dans le navigateur.

export class ExtractError extends Error {
  code: "unsupported_format" | "pdf_failed" | "empty_text" | "too_large";
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
    pdfjs.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    const data = await file.arrayBuffer();
    const doc = await pdfjs.getDocument({ data }).promise;
    let out = "";
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      out +=
        content.items
           
          .map((item: any) => ("str" in item ? item.str : ""))
          .join(" ") + "\n\n";
      if (out.length > MAX_CHARS) break;
    }
    return out;
  } catch {
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
