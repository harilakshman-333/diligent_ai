import { NextRequest, NextResponse } from "next/server";
import { runFounderIntel } from "@/lib/founder-intel";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyName, teamHighlights, sector } = body;

    if (!companyName) {
      return NextResponse.json(
        { error: "companyName is required." },
        { status: 400 }
      );
    }

    const result = await runFounderIntel(
      companyName,
      teamHighlights || "Not available",
      sector || "Unknown"
    );

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Founder Intel API error:", error);
    return NextResponse.json(
      { error: "Internal server error during founder intel check." },
      { status: 500 }
    );
  }
}
