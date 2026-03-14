import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, memo, companyName, history } = body as {
      message: string;
      memo: string;
      companyName: string;
      history?: ChatMessage[];
    };

    if (!message || !memo) {
      return NextResponse.json(
        { error: "Both message and memo context are required." },
        { status: 400 }
      );
    }

    // Build conversation history for multi-turn chat
    const messages: ChatMessage[] = [
      ...(history || []),
      { role: "user" as const, content: message },
    ];

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: `You are a senior VC due diligence analyst. You have analyzed a company called "${companyName}" and produced the investment memo below. Answer the user's follow-up questions using information from the memo and your financial expertise.

Be concise, data-driven, and direct. When the user asks about specifics, reference the actual numbers and data points from the memo. If the memo doesn't contain enough information to answer confidently, say so and suggest what additional data would be needed.

Format replies for readability — use short paragraphs and bullet points where appropriate.

--- INVESTMENT MEMO ---
${memo.slice(0, 12000)}
--- END MEMO ---`,
      messages,
    });

    const reply =
      response.content[0].type === "text" ? response.content[0].text : "";

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Failed to generate response." },
      { status: 500 }
    );
  }
}
