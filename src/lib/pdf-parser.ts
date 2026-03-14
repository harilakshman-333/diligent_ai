import Anthropic from "@anthropic-ai/sdk";
import { PDFParse } from "pdf-parse";

const anthropic = new Anthropic();

export type PitchDeckData = {
  companyName: string;
  product: string;
  sector: string;
  mainCompetitors: string[];
  marketSize: string;
  askAmount: string;
  teamHighlights: string;
  keyMetricsClaimed: string;
  summary: string;
};

/**
 * Parse a pitch deck PDF using Claude's native PDF support.
 * Falls back to pdf-parse text extraction if the PDF is too large for base64.
 */
export async function parsePitchDeck(pdfFile: File): Promise<PitchDeckData> {
  const arrayBuffer = await pdfFile.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Claude supports PDFs up to ~32MB via base64
  const MAX_PDF_SIZE = 30 * 1024 * 1024; // 30MB to be safe

  let response;

  if (buffer.length <= MAX_PDF_SIZE) {
    // Primary path: send PDF directly to Claude
    const base64Pdf = buffer.toString("base64");

    response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: base64Pdf,
              },
            },
            {
              type: "text",
              text: `You are a VC analyst. Extract the following from this pitch deck PDF and return ONLY valid JSON (no markdown, no code fences):

{
  "companyName": "string",
  "product": "one-sentence description",
  "sector": "e.g. SaaS, FinTech, HealthTech",
  "mainCompetitors": ["up to 3 public company tickers if mentioned, e.g. MSFT, CRM"],
  "marketSize": "TAM figure from the deck, e.g. $10B",
  "askAmount": "funding ask if stated, otherwise N/A",
  "teamHighlights": "brief summary of founding team",
  "keyMetricsClaimed": "any revenue/growth/user metrics the startup claims",
  "summary": "2-3 sentence summary of what this startup does and why it matters"
}

If a field isn't found in the deck, use "N/A".`,
            },
          ],
        },
      ],
    });
  } else {
    // Fallback: extract text with pdf-parse, then send text to Claude
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    const textResult = await parser.getText();
    const text = textResult.text.slice(0, 50000); // Limit text length

    response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: `You are a VC analyst. Here is the extracted text from a startup pitch deck:

---
${text}
---

Extract the following and return ONLY valid JSON (no markdown, no code fences):

{
  "companyName": "string",
  "product": "one-sentence description",
  "sector": "e.g. SaaS, FinTech, HealthTech",
  "mainCompetitors": ["up to 3 public company tickers if mentioned, e.g. MSFT, CRM"],
  "marketSize": "TAM figure from the deck, e.g. $10B",
  "askAmount": "funding ask if stated, otherwise N/A",
  "teamHighlights": "brief summary of founding team",
  "keyMetricsClaimed": "any revenue/growth/user metrics the startup claims",
  "summary": "2-3 sentence summary of what this startup does and why it matters"
}

If a field isn't found in the deck, use "N/A".`,
        },
      ],
    });
  }

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  // Parse the JSON response, stripping any accidental markdown fences
  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const parsed = JSON.parse(cleaned) as PitchDeckData;

  // Claude sometimes returns mainCompetitors as a string instead of array
  if (!Array.isArray(parsed.mainCompetitors)) {
    parsed.mainCompetitors = parsed.mainCompetitors ? [String(parsed.mainCompetitors)] : [];
  }

  return parsed;
}
