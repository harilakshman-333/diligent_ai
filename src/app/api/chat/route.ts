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
      memo?: string;
      companyName?: string;
      history?: ChatMessage[];
    };

    if (!message) {
      return NextResponse.json(
        { error: "Message is required." },
        { status: 400 }
      );
    }

    // Build conversation history for multi-turn chat
    const messages: ChatMessage[] = [
      ...(history || []),
      { role: "user" as const, content: message },
    ];

    // Two modes: deal-specific (with memo) or general finance assistant
    const systemPrompt = memo
      ? `You are a senior VC due diligence analyst. You have analyzed a company called "${companyName}" and produced the investment memo below. Answer the user's follow-up questions using information from the memo and your financial expertise.

Be concise, data-driven, and direct. When the user asks about specifics, reference the actual numbers and data points from the memo. If the memo doesn't contain enough information to answer confidently, say so and suggest what additional data would be needed.

Format replies for readability — use short paragraphs and bullet points where appropriate.

--- INVESTMENT MEMO ---
${memo.slice(0, 12000)}
--- END MEMO ---`
      : `You are Diligent-AI, a live finance and investment assistant built for venture capitalists and traders. You have deep expertise in:

- **Public markets**: stocks, ETFs, indices, options, commodities, crypto
- **Venture capital**: startup evaluation, due diligence, cap tables, term sheets
- **Financial analysis**: DCF, comparable analysis, LBO, revenue modeling
- **Trading**: technical analysis, fundamentals, market sentiment, macro trends
- **Company research**: competitive landscape, TAM/SAM/SOM, management assessment
- **Regulation**: SEC filings, IPO process, compliance

Answer questions concisely and accurately. Use real financial terminology. When giving opinions on investments, always caveat that you are an AI assistant and this is not financial advice. Format replies for readability with short paragraphs and bullet points.

If someone asks about a specific stock or company, share what you know about their business model, competitive position, recent performance, and key metrics. Be direct and data-driven.`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: systemPrompt,
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
