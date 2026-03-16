import Anthropic from "@anthropic-ai/sdk";
import { PitchDeckData } from "./pdf-parser";
import { CombinedMarketData } from "./financial-data";

const anthropic = new Anthropic();

export type ParsedFinancials = {
  monthlyBurnRate: string;
  revenueGrowth: string;
  runway: string;
  lastMonthRevenue: string;
  rawSummary: string;
};

/**
 * Use Claude to parse a financial spreadsheet (CSV/Excel text content).
 */
export async function parseFinancials(
  fileContent: string,
  fileName: string
): Promise<ParsedFinancials> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `You are a financial analyst. Here is the content of a startup's financial spreadsheet (${fileName}):

---
${fileContent.slice(0, 30000)}
---

Analyze this data and return ONLY valid JSON (no markdown, no code fences):

{
  "monthlyBurnRate": "estimated monthly burn rate, e.g. $420K",
  "revenueGrowth": "month-over-month or stated growth rate, e.g. 18% MoM",
  "runway": "estimated runway in months based on cash and burn, e.g. 14 months",
  "lastMonthRevenue": "most recent monthly revenue figure, e.g. $1.2M",
  "rawSummary": "2-3 sentence summary of the financial health and trends"
}

If a field cannot be determined, use "N/A" and explain briefly in rawSummary.`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";
  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(cleaned) as ParsedFinancials;
}

/**
 * Generate the full investment memo using all gathered data.
 */
export async function generateMemo(
  pitchData: PitchDeckData,
  financials: ParsedFinancials,
  marketData: CombinedMarketData
): Promise<string> {
  const competitorSummary = marketData.competitors
    .map(
      (c) =>
        `- ${c.ticker} (${c.companyName}): Price ${c.currentPrice ? "$" + c.currentPrice : "N/A"}, Market Cap ${c.marketCap}, P/E ${c.peRatio}, 52W Range ${c.fiftyTwoWeekRange}, Revenue Growth ${c.revenueGrowth}`
    )
    .join("\n");

  const avSummary = marketData.alphaVantageData
    .map(
      (a) =>
        `- ${a.ticker}: Annual Revenue ${a.annualRevenue}, Net Income ${a.annualNetIncome}, Revenue Growth ${a.quarterlyRevenueGrowth}, EPS ${a.earningsPerShare}`
    )
    .join("\n");

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `You are a senior VC analyst at a top-tier venture capital firm. Write a professional investment memo based on the following data.

## PITCH DECK ANALYSIS
- Company: ${pitchData.companyName}
- Product: ${pitchData.product}
- Sector: ${pitchData.sector}
- Market Size (TAM): ${pitchData.marketSize}
- Funding Ask: ${pitchData.askAmount}
- Team: ${pitchData.teamHighlights}
- Claimed Metrics: ${pitchData.keyMetricsClaimed}
- Summary: ${pitchData.summary}

## STARTUP FINANCIALS
- Monthly Burn Rate: ${financials.monthlyBurnRate}
- Revenue Growth: ${financials.revenueGrowth}
- Runway: ${financials.runway}
- Last Month Revenue: ${financials.lastMonthRevenue}
- Financial Summary: ${financials.rawSummary}

## PUBLIC MARKET COMPARABLES (Yahoo Finance)
${competitorSummary || "No comparable company data available."}

## DETAILED FINANCIALS (Alpha Vantage)
${avSummary || "No detailed financial data available."}

---

Write the investment memo in Markdown with these sections:

# Investment Memo: [Company Name]

## Executive Summary
(2-3 paragraph overview with clear investment recommendation: STRONG BUY / BUY / HOLD / PASS)

## Company Overview
(What does the company do, what problem does it solve, what's the product)

## Market Opportunity
(TAM analysis, sector trends, growth potential — cross-reference with public market data)

## Competitive Landscape
(Compare against public comparables using the market data above. How does valuation compare? Where does the startup have an edge?)

## Financial Analysis
(Burn rate, runway, revenue trajectory. Are the startup's claimed metrics realistic vs. industry benchmarks?)

## Risk Factors
(Top 3-5 risks: market risk, execution risk, competitive risk, financial risk)

## Investment Recommendation
(Clear recommendation with reasoning. If investing, suggest terms/conditions.)

Be specific and data-driven. Reference actual numbers from the data above. Be honest about both strengths and red flags. This memo should read like it came from a Goldman Sachs analyst, not a chatbot.`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";
  return text;
}

/**
 * Generate a lighter investment memo from pitch deck + market data only (no financials).
 * Used for the WhatsApp "Coffee Shop" flow where a VC forwards just a PDF.
 */
export async function generatePitchOnlyMemo(
  pitchData: PitchDeckData,
  marketData: CombinedMarketData
): Promise<string> {
  const competitorSummary = marketData.competitors
    .map(
      (c) =>
        `- ${c.ticker} (${c.companyName}): Price ${c.currentPrice ? "$" + c.currentPrice : "N/A"}, Market Cap ${c.marketCap}, P/E ${c.peRatio}, 52W Range ${c.fiftyTwoWeekRange}, Revenue Growth ${c.revenueGrowth}`
    )
    .join("\n");

  const avSummary = marketData.alphaVantageData
    .map(
      (a) =>
        `- ${a.ticker}: Annual Revenue ${a.annualRevenue}, Net Income ${a.annualNetIncome}, Revenue Growth ${a.quarterlyRevenueGrowth}, EPS ${a.earningsPerShare}`
    )
    .join("\n");

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 3000,
    messages: [
      {
        role: "user",
        content: `You are a senior VC analyst. Write a quick-turn investment memo based ONLY on a pitch deck and public market comparables. No startup financials are available — flag this as a limitation.

## PITCH DECK ANALYSIS
- Company: ${pitchData.companyName}
- Product: ${pitchData.product}
- Sector: ${pitchData.sector}
- Market Size (TAM): ${pitchData.marketSize}
- Funding Ask: ${pitchData.askAmount}
- Team: ${pitchData.teamHighlights}
- Claimed Metrics: ${pitchData.keyMetricsClaimed}
- Summary: ${pitchData.summary}

## PUBLIC MARKET COMPARABLES (Yahoo Finance)
${competitorSummary || "No comparable company data available."}

## DETAILED FINANCIALS (Alpha Vantage)
${avSummary || "No detailed financial data available."}

---

Write a concise investment memo in Markdown:

# Quick Memo: [Company Name]

## Verdict
(One-line: STRONG BUY / BUY / HOLD / PASS + one-sentence rationale)

## What They Do
(2-3 sentences on the product and problem)

## Market Opportunity
(TAM, sector trends, cross-ref with public market data)

## Competitive Position
(How does the startup compare to public comps? Valuation sanity check using market data.)

## Key Strengths
(Top 3 bullet points)

## Red Flags
(Top 3-5 risks. Include "No financial data provided — request financials before proceeding" as a flag.)

## Next Steps
(What a VC should do: request financials, schedule call, pass, etc.)

Keep it punchy and data-driven — this is a quick read on a phone screen. Reference real numbers.`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";
  return text;
}
