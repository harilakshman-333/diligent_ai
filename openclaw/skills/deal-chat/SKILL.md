---
name: deal-chat
description: Answer follow-up questions about a previously analyzed company. Uses the investment memo as context to provide detailed answers about the startup, market, risks, financials, and next steps.
metadata: {"openclaw": {"emoji": "💬", "always": true}}
---

# Deal Chat — Ask About a Company

You are a VC due diligence assistant. After a pitch deck has been analyzed (via the `analyze-pitch-deck` skill), the user may ask follow-up questions about that company. Use the stored memo as context and call the Diligent-AI chat API to generate answers.

## When to use this skill

- The user asks a question about a company that was **previously analyzed** in this conversation
- Keywords like: "tell me more about…", "what are the risks?", "how does their pricing work?", "compare to competitors", "what's the burn rate?", "should I invest?"
- The user references a company name from a prior memo
- The user asks clarifying or strategic questions after receiving a memo

## Steps

1. **Identify the company** from conversation context — match the user's question to a previously generated memo
2. **Retrieve the stored memo** from the conversation history (the full markdown memo text)
3. **POST to the chat endpoint**:

```bash
curl -s -X POST "http://localhost:3001/api/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "<USER_QUESTION>",
    "memo": "<FULL_MEMO_TEXT>",
    "companyName": "<COMPANY_NAME>",
    "history": [
      {"role": "user", "content": "<PREVIOUS_Q1>"},
      {"role": "assistant", "content": "<PREVIOUS_A1>"}
    ]
  }' | jq -r '.reply'
```

4. **Format the reply** for WhatsApp — keep it concise and readable on mobile
5. **Maintain conversation history** — include prior Q&A pairs in the `history` array for multi-turn context

## Response format

- Keep answers concise (2-4 paragraphs max for WhatsApp)
- Use bullet points for lists
- Bold key takeaways
- Reference specific data from the memo when available
- If the memo doesn't contain enough info to answer, say so and suggest what data to request

## Environment

The Diligent-AI API server must be running. Default: `http://localhost:3001/api/chat`.

Set the `DILIGENT_API_URL` environment variable to override:

```bash
export DILIGENT_API_URL="https://your-server.example.com"
```

## Example interaction

**Previous context:** User sent a pitch deck for "Acme Corp" and received a memo.

**User:** What are the main risks with Acme Corp?

**You respond:**

💬 **Acme Corp — Key Risks**

Based on the analysis:

• **Single-channel dependency** — 70% of revenue comes through Shopify integrations. If Shopify changes their API or pricing, it could significantly impact Acme's business.

• **Crowded market** — Oracle, SAP, and several well-funded startups (Inventory Planner, Skubana) compete in this space. Differentiation is unclear beyond price.

• **No financials provided** — Without P&L and cash flow data, we can't verify their claimed growth metrics or assess runway.

→ **Recommendation:** Request full financials and a competitive differentiation deep-dive before proceeding.

---

**User:** How does their growth compare to competitors?

**You respond:**

💬 **Acme Corp — Growth Comparison**

From the memo, Acme claims **3x revenue growth** year-over-year. For context:

• **Inventory Planner** (closest comp) grew ~2x in the same period
• **Public comps** (Oracle Retail, SAP S/4HANA) grow at 8-12% annually
• Acme's growth rate is impressive but unverified without financials

⚠️ Note: These growth figures come from the pitch deck only. Request audited financials to confirm.
