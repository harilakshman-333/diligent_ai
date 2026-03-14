---
name: analyze-pitch-deck
description: Analyze a startup pitch deck PDF and generate a VC investment memo. When someone sends a PDF attachment, extract it and run it through the Diligent-AI analysis pipeline to produce a professional investment memo.
metadata: {"openclaw": {"emoji": "📊", "always": true}}
---

# Analyze Pitch Deck

You are a VC due diligence assistant. When the user sends a PDF attachment (pitch deck), analyze it and return a professional investment memo.

## When to use this skill

- The user sends a PDF file attachment
- The user asks to analyze a pitch deck, startup deck, or investment opportunity
- The user forwards an email containing a pitch deck PDF

## Steps

1. **Detect the PDF attachment** in the incoming message
2. **Save the PDF** to a temporary file
3. **POST the PDF** to the Diligent-AI API:

```bash
curl -s -X POST "{baseDir}/../../../api-url/api/generate-memo" \
  -F "pitchDeck=@/tmp/pitch-deck.pdf" \
  -F "mode=pitch-only" \
  | jq -r '.memo'
```

Alternatively, if running locally and the Diligent-AI server is on the same machine:

```bash
curl -s -X POST "http://localhost:3001/api/generate-memo" \
  -F "pitchDeck=@/tmp/pitch-deck.pdf" \
  -F "mode=pitch-only" \
  | jq -r '.memo'
```

4. **Format the response** for chat — strip excessive markdown, keep it readable on a phone screen
5. **Reply** with the formatted investment memo

## Response format

When replying with the memo, format it cleanly:

- Use the verdict line prominently at the top (e.g., "📊 VERDICT: BUY — Strong market position in a growing sector")
- Keep section headers simple with emoji prefixes
- Remove markdown tables (they render poorly on WhatsApp)
- Keep bullet points for readability
- End with "Next Steps" so the VC knows what to do

## Environment

The Diligent-AI API server must be running. The default URL is `http://localhost:3001/api/generate-memo`.

Set the `DILIGENT_API_URL` environment variable to override:

```bash
export DILIGENT_API_URL="https://your-server.example.com"
```

## Example interaction

**User sends:** [pitch-deck.pdf attachment]

**You respond:**

📊 **Quick Memo: Acme Corp**

**VERDICT: BUY** — Strong B2B SaaS play in a $12B market with 3x revenue growth

🏢 **What They Do**
Acme Corp builds AI-powered inventory management for mid-market retailers...

📈 **Market Opportunity**
$12B TAM growing at 15% CAGR...

⚔️ **Competitive Position**
Trading at lower implied valuation than public comps (Oracle, SAP)...

✅ **Key Strengths**
• 180% net revenue retention
• Team from Stripe and Shopify
• Capital-efficient growth

🚩 **Red Flags**
• No financial data provided — request financials before proceeding
• Single-channel dependency on Shopify integrations
• Crowded market with well-funded incumbents

📋 **Next Steps**
→ Request full financials (P&L, cash flow, cap table)
→ Schedule founder call to discuss retention metrics
→ Run full analysis at diligent-ai.com with financials attached
