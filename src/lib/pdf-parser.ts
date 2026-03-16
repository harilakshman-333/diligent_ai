import { genAI } from "./gemini";
import { PDFParse } from "pdf-parse";

const JSON_EXTRACT_PROMPT = `You are a VC analyst. Extract the following and return ONLY valid JSON (no markdown, no code fences):

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

If a field isn't found in the deck, use "N/A".`;

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

export type PitchDeckResult = {
  data: PitchDeckData;
  rawText: string;
};

/**
 * Parse a pitch deck PDF using Gemini's native PDF support.
 * Falls back to pdf-parse text extraction if the PDF is too large.
 */
export async function parsePitchDeck(pdfFile: File): Promise<PitchDeckResult> {
  const arrayBuffer = await pdfFile.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const MAX_PDF_SIZE = 20 * 1024 * 1024; // 20MB for Gemini inline data

  let responseText = "";
  let rawText = "";

  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  if (buffer.length <= MAX_PDF_SIZE) {
    // Primary path: send PDF directly to Gemini
    const base64Pdf = buffer.toString("base64");

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: "application/pdf",
                data: base64Pdf,
              },
            },
            {
              text: JSON_EXTRACT_PROMPT,
            },
          ],
        },
      ],
      generationConfig: { maxOutputTokens: 2048 },
    });

    responseText = result.response.text();
  } else {
    // Fallback: extract text with pdf-parse, then send text to Gemini
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    const textResult = await parser.getText();
    rawText = textResult.text.slice(0, 50000);

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Here is the extracted text from a startup pitch deck:\n\n---\n${rawText}\n---\n\n${JSON_EXTRACT_PROMPT}`,
            },
          ],
        },
      ],
      generationConfig: { maxOutputTokens: 2048 },
    });

    responseText = result.response.text();
  }

  // Parse the JSON response, stripping any accidental markdown fences
  const cleaned = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const parsed = JSON.parse(cleaned) as PitchDeckData;

  // Gemini sometimes returns mainCompetitors as a string instead of array
  if (!Array.isArray(parsed.mainCompetitors)) {
    parsed.mainCompetitors = parsed.mainCompetitors ? [String(parsed.mainCompetitors)] : [];
  }

  // If we used the base64 path, try to extract raw text via pdf-parse for legal scan
  if (!rawText) {
    try {
      const parser = new PDFParse({ data: new Uint8Array(buffer) });
      const textResult = await parser.getText();
      rawText = textResult.text.slice(0, 50000);
    } catch {
      // Use the structured data as fallback text
      rawText = JSON.stringify(parsed);
    }
  }

  return { data: parsed, rawText };
}
