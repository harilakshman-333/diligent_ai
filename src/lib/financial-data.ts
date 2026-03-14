import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

const AV_KEY = process.env.ALPHA_VANTAGE_API_KEY || "";
const AV_BASE = "https://www.alphavantage.co/query";

export type MarketCompData = {
  ticker: string;
  companyName: string;
  currentPrice: number | null;
  marketCap: string;
  peRatio: string;
  sector: string;
  revenueGrowth: string;
  fiftyTwoWeekRange: string;
};

export type AlphaVantageFinancials = {
  ticker: string;
  annualRevenue: string;
  annualNetIncome: string;
  quarterlyRevenueGrowth: string;
  earningsPerShare: string;
};

export type CombinedMarketData = {
  competitors: MarketCompData[];
  alphaVantageData: AlphaVantageFinancials[];
};

/**
 * Fetch quote + profile data from Yahoo Finance for a given ticker.
 */
async function fetchYahooData(ticker: string): Promise<MarketCompData> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const quote: any = await yahooFinance.quote(ticker);

    return {
      ticker: ticker.toUpperCase(),
      companyName: quote.shortName || quote.longName || ticker,
      currentPrice: quote.regularMarketPrice ?? null,
      marketCap: formatLargeNumber(quote.marketCap),
      peRatio: quote.trailingPE ? quote.trailingPE.toFixed(1) + "x" : "N/A",
      sector: quote.sector || "N/A",
      revenueGrowth: quote.revenueGrowth
        ? (quote.revenueGrowth * 100).toFixed(1) + "%"
        : "N/A",
      fiftyTwoWeekRange: quote.fiftyTwoWeekLow && quote.fiftyTwoWeekHigh
        ? `$${quote.fiftyTwoWeekLow.toFixed(2)} - $${quote.fiftyTwoWeekHigh.toFixed(2)}`
        : "N/A",
    };
  } catch (error) {
    console.error(`Yahoo Finance error for ${ticker}:`, error);
    return {
      ticker: ticker.toUpperCase(),
      companyName: ticker,
      currentPrice: null,
      marketCap: "N/A",
      peRatio: "N/A",
      sector: "N/A",
      revenueGrowth: "N/A",
      fiftyTwoWeekRange: "N/A",
    };
  }
}

/**
 * Fetch income statement data from Alpha Vantage for a given ticker.
 */
async function fetchAlphaVantageData(
  ticker: string
): Promise<AlphaVantageFinancials> {
  try {
    const url = `${AV_BASE}?function=INCOME_STATEMENT&symbol=${encodeURIComponent(ticker)}&apikey=${AV_KEY}`;
    const res = await fetch(url);
    const data = await res.json();

    const annualReports = data.annualReports || [];
    const latestAnnual = annualReports[0] || {};
    const previousAnnual = annualReports[1] || {};

    const latestRevenue = parseFloat(latestAnnual.totalRevenue) || 0;
    const previousRevenue = parseFloat(previousAnnual.totalRevenue) || 0;
    const qGrowth =
      previousRevenue > 0
        ? (((latestRevenue - previousRevenue) / previousRevenue) * 100).toFixed(1) + "% YoY"
        : "N/A";

    return {
      ticker: ticker.toUpperCase(),
      annualRevenue: formatLargeNumber(latestRevenue),
      annualNetIncome: formatLargeNumber(
        parseFloat(latestAnnual.netIncome) || 0
      ),
      quarterlyRevenueGrowth: qGrowth,
      earningsPerShare: latestAnnual.reportedEPS || "N/A",
    };
  } catch (error) {
    console.error(`Alpha Vantage error for ${ticker}:`, error);
    return {
      ticker: ticker.toUpperCase(),
      annualRevenue: "N/A",
      annualNetIncome: "N/A",
      quarterlyRevenueGrowth: "N/A",
      earningsPerShare: "N/A",
    };
  }
}

/**
 * Fetch market data for a list of competitor tickers using both Yahoo Finance and Alpha Vantage.
 */
export async function fetchMarketData(
  tickers: string[]
): Promise<CombinedMarketData> {
  // Deduplicate and limit to 5 tickers
  const uniqueTickers = [...new Set(tickers.map((t) => t.toUpperCase()))].slice(0, 5);

  // Fetch from both sources in parallel
  const [competitors, alphaVantageData] = await Promise.all([
    Promise.all(uniqueTickers.map(fetchYahooData)),
    Promise.all(uniqueTickers.map(fetchAlphaVantageData)),
  ]);

  return { competitors, alphaVantageData };
}

function formatLargeNumber(value: number | undefined | null): string {
  if (!value || value === 0) return "N/A";
  if (Math.abs(value) >= 1e12) return `$${(value / 1e12).toFixed(1)}T`;
  if (Math.abs(value) >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (Math.abs(value) >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  return `$${value.toLocaleString()}`;
}
