import { NextRequest, NextResponse } from "next/server";
import { generateText } from "@/lib/gemini";

type BriefingDeal = {
  companyName: string;
  sender: string;
  subject: string;
  verdict: string;
  sector: string;
  keyRisk: string;
  summary: string;
};

type BriefingRequest = {
  deals: BriefingDeal[];
  totalEmails: number;
  pitchDecksFound: number;
  date: string;
};

export async function POST(request: NextRequest) {
  try {
    const body: BriefingRequest = await request.json();
    const { deals, totalEmails, pitchDecksFound, date } = body;

    if (!deals || !Array.isArray(deals)) {
      return NextResponse.json(
        { error: "deals array is required." },
        { status: 400 }
      );
    }

    // If no deals found, return a short message
    if (deals.length === 0) {
      const noDealsBriefing = `☀️ MORNING DEAL FLOW BRIEFING\n📅 ${formatDate(date)}\n\n📬 ${totalEmails || 0} emails scanned | 0 pitch decks found\n\nNo new pitch decks in your inbox today. Enjoy your coffee! ☕`;
      return NextResponse.json({
        success: true,
        briefing: noDealsBriefing,
        dealCount: 0,
      });
    }

    // Use Claude to compile a professional briefing
    const dealsContext = deals
      .map(
        (d, i) =>
          `Deal ${i + 1}:\n- Company: ${d.companyName}\n- Sender: ${d.sender}\n- Subject: ${d.subject}\n- Verdict: ${d.verdict}\n- Sector: ${d.sector}\n- Key Risk: ${d.keyRisk}\n- Summary: ${d.summary}`
      )
      .join("\n\n");

    const briefing = await generateText(
      `You are a VC deal flow analyst. Compile the following analyzed pitch decks into a concise "Morning Deal Flow Briefing" that a partner can read in 60 seconds.

Date: ${date}
Total emails scanned: ${totalEmails}
Pitch decks found: ${pitchDecksFound}

Analyzed Deals:
${dealsContext}

Format the briefing exactly like this (use plain text, NOT markdown — this goes to WhatsApp):

☀️ MORNING DEAL FLOW BRIEFING
📅 {formatted date}

📬 {totalEmails} emails scanned | {pitchDecksFound} pitch decks found

━━━━━━━━━━━━━━━━━━━━━━━━━

🟢 TAKE MEETING ({count of BUY or STRONG BUY})

{For each BUY/STRONG BUY deal, numbered:}
 #️⃣ {Company} — {VERDICT}
    {Sector} · {one-line summary}
    From: {sender}
    ⚠️ Risk: {key risk}

━━━━━━━━━━━━━━━━━━━━━━━━━

🟡 MAYBE ({count of HOLD})

{Same format for HOLD deals, or omit section if none}

━━━━━━━━━━━━━━━━━━━━━━━━━

🔴 PASS ({count of PASS})

{Same format for PASS deals, or omit section if none}

━━━━━━━━━━━━━━━━━━━━━━━━━

💡 Reply with a company name for the full memo
📊 Powered by Diligent-AI

Rules:
- Sort by verdict priority: STRONG BUY first, then BUY, HOLD, PASS
- Keep summaries to ONE line (max 60 chars)
- Include ALL deals provided
- If a section has 0 deals, omit it entirely
- Use emoji numbers (1️⃣ 2️⃣ 3️⃣ etc.) for numbering, continuing across sections`,
      { maxTokens: 2048 }
    );

    const briefingText = briefing || "Failed to generate briefing.";

    // Build a structured deal log
    const dealLog = deals.map((d) => ({
      companyName: d.companyName,
      sender: d.sender,
      verdict: d.verdict,
      sector: d.sector,
      date,
    }));

    return NextResponse.json({
      success: true,
      briefing: briefingText,
      dealCount: deals.length,
      dealLog,
    });
  } catch (error) {
    console.error("Briefing API error:", error);
    return NextResponse.json(
      { error: "Internal server error while generating briefing." },
      { status: 500 }
    );
  }
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}
