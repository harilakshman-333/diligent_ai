import { NextRequest, NextResponse } from "next/server";
import { parsePitchDeck } from "@/lib/pdf-parser";
import { fetchMarketData } from "@/lib/financial-data";
import {
  parseFinancials,
  generateMemo,
  generatePitchOnlyMemo,
} from "@/lib/memo-generator";
import { runFounderIntel, FounderIntelResult } from "@/lib/founder-intel";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const pdfFile = formData.get("pitchDeck") as File | null;
    const spreadsheetFile = formData.get("financials") as File | null;
    const mode = formData.get("mode") as string | null;
    const pitchOnly = mode === "pitch-only" || (!spreadsheetFile && !!pdfFile);

    if (!pdfFile) {
      return NextResponse.json(
        { error: "A pitchDeck (PDF) file is required." },
        { status: 400 }
      );
    }

    if (!pitchOnly && !spreadsheetFile) {
      return NextResponse.json(
        {
          error:
            "Both pitchDeck (PDF) and financials (CSV/Excel) files are required for full analysis. Send mode=pitch-only for deck-only analysis.",
        },
        { status: 400 }
      );
    }

    // Validate PDF
    if (pdfFile.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Pitch deck must be a PDF file." },
        { status: 400 }
      );
    }

    // Step 1: Parse the pitch deck with Claude
    const pitchData = await parsePitchDeck(pdfFile);

    // Step 2: Fetch public market data for competitors
    const competitorList = Array.isArray(pitchData.mainCompetitors)
      ? pitchData.mainCompetitors
      : [];
    const tickers = competitorList.filter(
      (t) => t && t !== "N/A" && t.length <= 10
    );
    const marketData = await fetchMarketData(tickers);

    if (pitchOnly) {
      // Pitch-only mode: no financials, lighter memo
      // Run memo generation and founder intel in parallel
      const [memo, founderIntel] = await Promise.all([
        generatePitchOnlyMemo(pitchData, marketData),
        runFounderIntel(
          pitchData.companyName,
          pitchData.teamHighlights,
          pitchData.sector
        ).catch((err): FounderIntelResult => {
          console.error("Founder intel failed (non-blocking):", err.message);
          return {
            founders: [],
            companyCheck: { companiesHouse: "Check failed", secEdgar: "Check failed", incorporationStatus: "Unknown", filingFlags: [] },
            adverseMedia: [],
            inconsistencies: [],
            overallRiskLevel: "medium",
            summary: "Founder intel check could not be completed.",
            sources: [],
          };
        }),
      ]);

      const verdictMatch = memo.match(/\b(STRONG BUY|BUY|HOLD|PASS)\b/);

      return NextResponse.json({
        success: true,
        mode: "pitch-only",
        memo,
        pitchData,
        marketData,
        founderIntel,
        dealLog: {
          companyName: pitchData.companyName,
          sector: pitchData.sector,
          verdict: verdictMatch?.[1] || "ANALYZED",
          mode: "pitch-only",
          timestamp: new Date().toISOString(),
          tickersQueried: tickers,
        },
      });
    }

    // Full mode: validate spreadsheet and include financials
    const hasValidExt = /\.(csv|xlsx?|xls)$/i.test(spreadsheetFile!.name);
    const validSpreadsheetTypes = [
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];
    if (
      !validSpreadsheetTypes.includes(spreadsheetFile!.type) &&
      !hasValidExt
    ) {
      return NextResponse.json(
        { error: "Financials must be a CSV or Excel file." },
        { status: 400 }
      );
    }

    // Step 3: Parse the financial spreadsheet with Claude
    const spreadsheetText = await spreadsheetFile!.text();
    const financials = await parseFinancials(
      spreadsheetText,
      spreadsheetFile!.name
    );

    // Step 4: Generate the full investment memo + founder intel in parallel
    const [memo, founderIntel] = await Promise.all([
      generateMemo(pitchData, financials, marketData),
      runFounderIntel(
        pitchData.companyName,
        pitchData.teamHighlights,
        pitchData.sector
      ).catch((err): FounderIntelResult => {
        console.error("Founder intel failed (non-blocking):", err.message);
        return {
          founders: [],
          companyCheck: { companiesHouse: "Check failed", secEdgar: "Check failed", incorporationStatus: "Unknown", filingFlags: [] },
          adverseMedia: [],
          inconsistencies: [],
          overallRiskLevel: "medium",
          summary: "Founder intel check could not be completed.",
          sources: [],
        };
      }),
    ]);

    const verdictMatch = memo.match(/\b(STRONG BUY|BUY|HOLD|PASS)\b/);

    return NextResponse.json({
      success: true,
      mode: "full",
      memo,
      pitchData,
      financials,
      marketData,
      founderIntel,
      dealLog: {
        companyName: pitchData.companyName,
        sector: pitchData.sector,
        verdict: verdictMatch?.[1] || "ANALYZED",
        mode: "full",
        timestamp: new Date().toISOString(),
        tickersQueried: tickers,
      },
    });
  } catch (error) {
    console.error("Upload API error:", error);
    return NextResponse.json(
      { error: "Internal server error while processing files." },
      { status: 500 }
    );
  }
}
