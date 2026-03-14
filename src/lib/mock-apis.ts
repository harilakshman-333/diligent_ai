/**
 * Mock API utilities for Diligent-AI
 * These will be replaced with real Wordsmith and Financial Datasets API calls
 * once we receive the API keys.
 */

export type WordsmithResult = {
  companyName: string;
  product: string;
  mainCompetitor: string;
  marketSize: string;
};

export type FinancialDataResult = {
  ticker: string;
  currentMultiple: string;
  recentRisk: string;
};

export type ParsedFinancials = {
  monthlyBurnRate: string;
  revenueGrowth: string;
  runway: string;
  lastMonthRevenue: string;
};

/**
 * Mock Wordsmith PDF parser.
 * Accepts a PDF file and returns extracted pitch deck data.
 * TODO: Replace with real Wordsmith API call.
 */
export async function mockWordsmithParse(
  _pdfFile: File
): Promise<WordsmithResult> {
  // Simulate network latency
  await new Promise((resolve) => setTimeout(resolve, 800));

  return {
    companyName: "Acme AI",
    product: "AI-Powered Developer Tools",
    mainCompetitor: "MSFT",
    marketSize: "$10B",
  };
}

/**
 * Mock Financial Datasets API.
 * Accepts a ticker symbol and returns market data for the public competitor.
 * TODO: Replace with real Financial Datasets / MCP call.
 */
export async function mockFinancialData(
  ticker: string
): Promise<FinancialDataResult> {
  // Simulate network latency
  await new Promise((resolve) => setTimeout(resolve, 600));

  return {
    ticker: ticker.toUpperCase(),
    currentMultiple: "12x Revenue",
    recentRisk: "High GPU costs impacting margins; increased competition in AI tooling",
  };
}

/**
 * Mock financial spreadsheet parser.
 * Accepts a CSV/Excel file and returns parsed financial metrics.
 * TODO: Replace with real Claude-based spreadsheet analysis in Phase 3.
 */
export async function mockParseFinancials(
  _spreadsheetFile: File
): Promise<ParsedFinancials> {
  // Simulate processing time
  await new Promise((resolve) => setTimeout(resolve, 700));

  return {
    monthlyBurnRate: "$420K",
    revenueGrowth: "18% MoM",
    runway: "14 months",
    lastMonthRevenue: "$1.2M",
  };
}
