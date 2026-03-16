import { NextRequest, NextResponse } from "next/server";
import { genAI } from "@/lib/gemini";

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

    // Limit history to last 10 messages to reduce token usage
    const recentHistory = (history || []).slice(-10);

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

    // Build Gemini contents array from history
    const contents = recentHistory.map((msg) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));
    contents.push({ role: "user", parts: [{ text: message }] });

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: systemPrompt,
    });

    const result = await model.generateContent({
      contents,
      generationConfig: { maxOutputTokens: 1024 },
    });

    const reply = result.response.text();

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Failed to generate response." },
      { status: 500 }
    );
  }
}
