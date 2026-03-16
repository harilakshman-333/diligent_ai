/**
 * Research / News Feed API
 *
 * POST /api/openclaw/research — Search for a company or topic
 *
 * Uses Yahoo Finance for company data, news, and trending info,
 * plus Claude to synthesize a news-style briefing.
 */

import { NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";
import Anthropic from "@anthropic-ai/sdk";

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });
const anthropic = new Anthropic();
const AV_KEY = process.env.ALPHA_VANTAGE_API_KEY || "";
const AV_BASE = "https://www.alphavantage.co/query";

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  timestamp: string;
  url: string;
  category: "market" | "company" | "analysis" | "insight";
  sentiment: "positive" | "negative" | "neutral";
  ticker?: string;
}

interface CompanySnapshot {
  name: string;
  ticker: string;
  price: number | null;
  change: string;
  changePercent: string;
  marketCap: string;
  peRatio: string;
  sector: string;
  fiftyTwoWeekRange: string;
  volume: string;
  avgVolume: string;
}

interface ResearchResult {
  id: string;
  query: string;
  timestamp: string;
  companies: CompanySnapshot[];
  news: NewsItem[];
  aiSummary: string;
  status: "success" | "error";
  error?: string;
}

function formatLargeNumber(num: number | undefined | null): string {
  if (!num) return "N/A";
  if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(1)}M`;
  return `$${num.toLocaleString()}`;
}

function formatVolume(num: number | undefined | null): string {
  if (!num) return "N/A";
  if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
  return num.toLocaleString();
}

async function searchTickers(query: string): Promise<string[]> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results: any = await yahooFinance.search(query);
    const quotes = results?.quotes || [];
    return quotes
      .filter((q: { quoteType?: string }) => q.quoteType === "EQUITY")
      .slice(0, 5)
      .map((q: { symbol: string }) => q.symbol);
  } catch {
    return [];
  }
}

async function fetchCompanySnapshot(ticker: string): Promise<CompanySnapshot | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const quote: any = await yahooFinance.quote(ticker);
    return {
      name: quote.shortName || quote.longName || ticker,
      ticker: ticker.toUpperCase(),
      price: quote.regularMarketPrice ?? null,
      change: quote.regularMarketChange != null
        ? `${quote.regularMarketChange >= 0 ? "+" : ""}${quote.regularMarketChange.toFixed(2)}`
        : "N/A",
      changePercent: quote.regularMarketChangePercent != null
        ? `${quote.regularMarketChangePercent >= 0 ? "+" : ""}${quote.regularMarketChangePercent.toFixed(2)}%`
        : "N/A",
      marketCap: formatLargeNumber(quote.marketCap),
      peRatio: quote.trailingPE ? quote.trailingPE.toFixed(1) + "x" : "N/A",
      sector: quote.sector || "N/A",
      fiftyTwoWeekRange:
        quote.fiftyTwoWeekLow && quote.fiftyTwoWeekHigh
          ? `$${quote.fiftyTwoWeekLow.toFixed(2)} - $${quote.fiftyTwoWeekHigh.toFixed(2)}`
          : "N/A",
      volume: formatVolume(quote.regularMarketVolume),
      avgVolume: formatVolume(quote.averageDailyVolume3Month),
    };
  } catch {
    return null;
  }
}

async function fetchAlphaVantageNews(query: string): Promise<NewsItem[]> {
  if (!AV_KEY) return [];
  try {
    const url = `${AV_BASE}?function=NEWS_SENTIMENT&tickers=${encodeURIComponent(query)}&limit=10&apikey=${AV_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const feed = data?.feed || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return feed.slice(0, 8).map((item: any, i: number) => {
      const score = parseFloat(item.overall_sentiment_score || "0");
      return {
        id: `av-${Date.now()}-${i}`,
        title: item.title || "Untitled",
        summary: item.summary || "",
        source: item.source || "Alpha Vantage",
        timestamp: item.time_published
          ? new Date(
              item.time_published.replace(
                /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/,
                "$1-$2-$3T$4:$5:$6"
              )
            ).toISOString()
          : new Date().toISOString(),
        url: item.url || "#",
        category: "company" as const,
        sentiment: score > 0.15 ? "positive" : score < -0.15 ? "negative" : "neutral",
        ticker: item.ticker_sentiment?.[0]?.ticker || undefined,
      };
    });
  } catch {
    return [];
  }
}

async function generateAISummary(
  query: string,
  companies: CompanySnapshot[],
  news: NewsItem[]
): Promise<string> {
  const companyContext = companies
    .map(
      (c) =>
        `${c.name} (${c.ticker}): Price $${c.price?.toFixed(2) ?? "N/A"}, Change ${c.change} (${c.changePercent}), Market Cap ${c.marketCap}, P/E ${c.peRatio}, Sector ${c.sector}`
    )
    .join("\n");

  const newsContext = news
    .slice(0, 8)
    .map((n) => `- [${n.source}] ${n.title}: ${n.summary.slice(0, 200)}`)
    .join("\n");

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      messages: [
        {
          role: "user",
          content: `You are a financial news analyst. Write a concise market briefing about "${query}" based on the data below. Use markdown formatting. Include sections: **Market Snapshot**, **Key Developments**, and **Outlook**. Be specific with numbers. Keep it under 400 words.

COMPANY DATA:
${companyContext || "No company data available."}

RECENT NEWS:
${newsContext || "No recent news found."}

Write the briefing now:`,
        },
      ],
    });
    return response.content[0].type === "text" ? response.content[0].text : "";
  } catch {
    return "AI summary unavailable.";
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const query = (body.query || "").trim();

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    const researchId = `research-${Date.now()}`;

    // Step 1: Search for matching tickers
    const tickers = await searchTickers(query);

    // Step 2: Fetch company snapshots in parallel
    const companyPromises = tickers.map(fetchCompanySnapshot);
    const companyResults = await Promise.all(companyPromises);
    const companies = companyResults.filter(Boolean) as CompanySnapshot[];

    // Step 3: Fetch news from Alpha Vantage
    const tickerQuery = tickers.length > 0 ? tickers.slice(0, 3).join(",") : query;
    const news = await fetchAlphaVantageNews(tickerQuery);

    // Step 4: Generate AI summary
    const aiSummary = await generateAISummary(query, companies, news);

    const result: ResearchResult = {
      id: researchId,
      query,
      timestamp: new Date().toISOString(),
      companies,
      news,
      aiSummary,
      status: "success",
    };

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        id: `research-${Date.now()}`,
        query: "",
        timestamp: new Date().toISOString(),
        companies: [],
        news: [],
        aiSummary: "",
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
