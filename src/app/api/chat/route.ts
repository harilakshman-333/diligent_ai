import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

async function callWithRetry(
  params: Anthropic.MessageCreateParamsNonStreaming,
  retries = 2
): Promise<Anthropic.Message> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await anthropic.messages.create(params);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      // On rate limit, try fallback model once
      if (msg.includes("rate_limit") && attempt === 0) {
        const fallbackModel = params.model === "claude-sonnet-4-20250514"
          ? "claude-opus-4-20250514"
          : params.model;
        if (fallbackModel !== params.model) {
          try {
            return await anthropic.messages.create({ ...params, model: fallbackModel });
          } catch {
            throw err; // fallback also failed, throw original
          }
        }
        throw err;
      }
      // Retry other transient errors
      if (attempt < retries - 1) {
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }
      throw err;
    }
  }
  throw new Error("Max retries exceeded");
}

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

    // Limit history to last 10 messages to reduce token usage
    const recentHistory = (history || []).slice(-10);

    // Build conversation history for multi-turn chat
    const messages: ChatMessage[] = [
      ...recentHistory,
      { role: "user" as const, content: message },
    ];

    // Two modes: deal-specific (with memo) or general finance assistant
    const systemPrompt = memo
      ? `You are a senior VC due diligence analyst. You have analyzed a company called "${companyName}" and produced the investment memo below. Answer the user's follow-up questions using information from the memo and your financial expertise.

Be concise, data-driven, and direct. When the user asks about specifics, reference the actual numbers and data points from the memo. If the memo doesn't contain enough information to answer confidently, say so and suggest what additional data would be needed.

Format replies for readability — use short paragraphs and bullet points where appropriate.

--- INVESTMENT MEMO ---
${memo.slice(0, 8000)}
--- END MEMO ---`
      : `You are Diligent-AI, a live finance and investment assistant for VCs and traders. You have expertise in public markets, venture capital, financial analysis (DCF, comps, LBO), trading, company research, and regulation.

Answer concisely and accurately. Use financial terminology. Caveat that you are an AI and this is not financial advice. Use short paragraphs and bullet points.`;

    const response = await callWithRetry({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    });

    const reply =
      response.content[0].type === "text" ? response.content[0].text : "";

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Chat API error:", error);
    const isRateLimit =
      error instanceof Error && error.message.includes("rate_limit");
    return NextResponse.json(
      {
        error: isRateLimit
          ? "Rate limited — please wait a moment and try again."
          : "Failed to generate response.",
      },
      { status: isRateLimit ? 429 : 500 }
    );
  }
}
