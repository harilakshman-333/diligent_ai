import { generateText } from "./gemini";
import { PitchDeckData } from "./pdf-parser";
import { ParsedFinancials } from "./memo-generator";

export type IPFlag = {
  issue: string;
  severity: "critical" | "warning" | "info";
  detail: string;
};

export type FinancialDiscrepancy = {
  field: string;
  deckValue: string;
  spreadsheetValue: string;
  severity: "critical" | "warning" | "info";
  explanation: string;
};

export type CapTableFlag = {
  issue: string;
  severity: "critical" | "warning" | "info";
  detail: string;
};

export type MissingDocument = {
  document: string;
  importance: "required" | "recommended" | "nice-to-have";
  reason: string;
};

export type LegalScanResult = {
  ipFlags: IPFlag[];
  financialDiscrepancies: FinancialDiscrepancy[];
  capTableFlags: CapTableFlag[];
  missingDocuments: MissingDocument[];
  overallRiskLevel: "low" | "medium" | "high";
  summary: string;
};

/**
 * Run a comprehensive Legal & Cap Table Scan.
 * This runs a single focused prompt that covers IP, financials cross-validation,
 * cap table red flags, and missing documents — all in one call to minimize token usage.
 */
export async function runLegalScan(
  pitchData: PitchDeckData,
  financials: ParsedFinancials | null,
  deckRawText: string
): Promise<LegalScanResult> {
  const financialsSection = financials
    ? `## SPREADSHEET FINANCIALS
- Monthly Burn Rate: ${financials.monthlyBurnRate}
- Revenue Growth: ${financials.revenueGrowth}
- Runway: ${financials.runway}
- Last Month Revenue: ${financials.lastMonthRevenue}
- Summary: ${financials.rawSummary}`
    : "No separate financial spreadsheet was uploaded.";

  const text = await generateText(
    `You are a senior legal and financial due diligence analyst at a top-tier VC firm. Perform a structured scan of this deal and return your findings as JSON.

## PITCH DECK DATA
- Company: ${pitchData.companyName}
- Product: ${pitchData.product}
- Sector: ${pitchData.sector}
- Market Size: ${pitchData.marketSize}
- Funding Ask: ${pitchData.askAmount}
- Team: ${pitchData.teamHighlights}
- Claimed Metrics: ${pitchData.keyMetricsClaimed}
- Summary: ${pitchData.summary}

## RAW DECK TEXT (for IP/legal language detection)
${deckRawText.slice(0, 15000)}

${financialsSection}

---

Analyze the following areas and return ONLY valid JSON (no markdown, no code fences):

{
  "ipFlags": [
    {
      "issue": "short title",
      "severity": "critical | warning | info",
      "detail": "explanation"
    }
  ],
  "financialDiscrepancies": [
    {
      "field": "e.g. Revenue, ARR, Growth Rate",
      "deckValue": "value stated in pitch deck",
      "spreadsheetValue": "value from financials spreadsheet",
      "severity": "critical | warning | info",
      "explanation": "why this matters"
    }
  ],
  "capTableFlags": [
    {
      "issue": "short title",
      "severity": "critical | warning | info",
      "detail": "explanation"
    }
  ],
  "missingDocuments": [
    {
      "document": "document name",
      "importance": "required | recommended | nice-to-have",
      "reason": "why it's needed"
    }
  ],
  "overallRiskLevel": "low | medium | high",
  "summary": "2-3 sentence overall legal/compliance risk summary"
}

ANALYSIS INSTRUCTIONS:
1. **IP Flags**: Look for mentions of patents, trademarks, IP ownership, university IP, open-source dependencies, or third-party code. Flag if IP appears to sit with individuals rather than the company entity. Flag university associations or academic origins that could imply prior IP claims.
2. **Financial Discrepancies**: Compare any revenue, ARR, growth rates, or valuation figures mentioned in the deck against the spreadsheet data. Flag mismatches (e.g. deck says $1.2M ARR but spreadsheet shows $1.05M revenue). If no spreadsheet provided, note this as a gap.
3. **Cap Table Flags**: Scan for: high advisor equity (>5%), mentions of departed co-founders with undiluted stakes, unusual convertible note structures, regulatory language suggesting sector-specific compliance needs (fintech, health, defense, crypto), vesting cliff concerns.
4. **Missing Documents**: Generate a checklist of documents not provided but needed for proper diligence: articles of incorporation, IP assignment agreements, employment agreements, cap table, option pool details, financial audits, customer contracts, regulatory licenses.

If an area has no issues, return an empty array for that field. Be conservative — flag things that warrant further investigation even if not definitive problems.`,
    { maxTokens: 2048 }
  );

  const cleaned = text.replace(/\`\`\`json\n?/g, "").replace(/\`\`\`\n?/g, "").trim();

  try {
    return JSON.parse(cleaned) as LegalScanResult;
  } catch {
    return {
      ipFlags: [],
      financialDiscrepancies: [],
      capTableFlags: [],
      missingDocuments: [],
      overallRiskLevel: "medium",
      summary: "Legal scan could not parse results. Manual review recommended.",
    };
  }
}
