import { readFile } from "fs/promises";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
export const RESUME_PDF_PATH = path.join(DATA_DIR, "resume.pdf");

function normalizeExtractedText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: new Uint8Array(buffer) });

  try {
    const result = await parser.getText();
    return normalizeExtractedText(result.text);
  } finally {
    await parser.destroy();
  }
}

export async function extractTextFromStoredPdf(): Promise<string | null> {
  try {
    const buffer = await readFile(RESUME_PDF_PATH);
    return extractTextFromPdf(buffer);
  } catch {
    return null;
  }
}
