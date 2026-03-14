import { NextRequest, NextResponse } from "next/server";
import {
  mockWordsmithParse,
  mockFinancialData,
  mockParseFinancials,
} from "@/lib/mock-apis";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const pdfFile = formData.get("pitchDeck") as File | null;
    const spreadsheetFile = formData.get("financials") as File | null;

    if (!pdfFile || !spreadsheetFile) {
      return NextResponse.json(
        { error: "Both pitchDeck (PDF) and financials (CSV/Excel) files are required." },
        { status: 400 }
      );
    }

    // Validate file types
    if (pdfFile.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Pitch deck must be a PDF file." },
        { status: 400 }
      );
    }

    const validSpreadsheetTypes = [
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];
    const hasValidExt = /\.(csv|xlsx?|xls)$/i.test(spreadsheetFile.name);
    if (!validSpreadsheetTypes.includes(spreadsheetFile.type) && !hasValidExt) {
      return NextResponse.json(
        { error: "Financials must be a CSV or Excel file." },
        { status: 400 }
      );
    }

    // Step 1: Parse the pitch deck (mock Wordsmith)
    const pitchData = await mockWordsmithParse(pdfFile);

    // Step 2: Parse the financial spreadsheet (mock)
    const financials = await mockParseFinancials(spreadsheetFile);

    // Step 3: Fetch public competitor market data (mock Financial Datasets)
    const marketData = await mockFinancialData(pitchData.mainCompetitor);

    return NextResponse.json({
      success: true,
      pitchData,
      financials,
      marketData,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error while processing files." },
      { status: 500 }
    );
  }
}
