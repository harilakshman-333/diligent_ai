import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export const geminiModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
export const geminiProModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

/**
 * Simple text generation helper.
 */
export async function generateText(
  prompt: string,
  opts?: { maxTokens?: number; systemInstruction?: string }
): Promise<string> {
  const model = opts?.systemInstruction
    ? genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        systemInstruction: opts.systemInstruction,
      })
    : geminiModel;

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      maxOutputTokens: opts?.maxTokens ?? 2048,
    },
  });

  return result.response.text();
}

export { genAI };
