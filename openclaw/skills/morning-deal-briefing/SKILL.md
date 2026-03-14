---
name: morning-deal-briefing
description: >
  Autonomous morning routine. Scans the VC's Gmail inbox for unread emails
  containing pitch deck PDFs received in the last 24 hours, runs each through
  the Diligent-AI analysis pipeline, and compiles a "Morning Deal Flow Briefing"
  summary sent via WhatsApp before the VC has their coffee.
metadata: {"openclaw": {"emoji": "☀️", "always": true}}
---

# Morning Deal Flow Briefing

You are a **proactive VC inbox analyst**. This skill is triggered autonomously by the HEARTBEAT daemon every morning at 07:00 AM. You do NOT wait for user input.

## When to use this skill

- **Autonomous trigger**: The HEARTBEAT daemon fires this skill at 07:00 AM daily
- **Manual trigger**: The user says "run morning briefing", "check my inbox", "any new decks?", or similar

## Prerequisites

- OpenClaw must have Gmail access (OAuth or app password configured during `pnpm openclaw onboard`)
- The Diligent-AI server must be running at `http://localhost:3001`
- WhatsApp channel must be linked (for sending the briefing)

## Steps

### 1. Read Unread Emails (Last 24 Hours)

Query the connected Gmail inbox for unread emails from the last 24 hours:

```
Search filter: is:unread newer_than:1d
```

Collect for each email:
- `sender` (name + email)
- `subject`
- `date` received
- `attachments[]` (list of filenames + MIME types)
- `bodySnippet` (first 200 characters of body text)

### 2. Filter for Pitch Deck Candidates

An email is a pitch deck candidate if **any** of these conditions are true:

- It has a **PDF attachment** (MIME: `application/pdf`)
- The subject contains keywords: "pitch deck", "pitch", "investment opportunity", "funding round", "series A/B/C", "seed round", "looking for investors", "raise", "fundraise"
- The body snippet contains: "pitch deck", "attached our deck", "please find attached", "investment memo"

**Exclude** emails from known newsletters, automated services, and no-reply addresses.

### 3. Analyze Each Pitch Deck

For each candidate email with a PDF attachment:

a. **Download the PDF** to a temporary file:
```bash
# Save attachment to /tmp/
FILENAME="/tmp/briefing-deck-$(date +%s).pdf"
# (OpenClaw's Gmail integration handles the download)
```

b. **POST to the Diligent-AI API** (pitch-only mode):
```bash
RESULT=$(curl -s -X POST "http://localhost:3001/api/generate-memo" \
  -F "pitchDeck=@${FILENAME}" \
  -F "mode=pitch-only")
```

c. **Extract key fields** from the response:
```bash
MEMO=$(echo "$RESULT" | jq -r '.memo')
COMPANY=$(echo "$RESULT" | jq -r '.pitchData.companyName // "Unknown"')
SECTOR=$(echo "$RESULT" | jq -r '.pitchData.sector // "N/A"')
```

d. **Extract the verdict** from the memo text — look for: `STRONG BUY`, `BUY`, `HOLD`, `PASS`

e. **Store the result** in persistent memory:
```
memory/deals/YYYY-MM-DD-{company-name}.md
```

With content:
```markdown
# {Company Name}
- **Date**: {email date}
- **Sender**: {sender name} <{sender email}>
- **Subject**: {email subject}
- **Verdict**: {STRONG BUY / BUY / HOLD / PASS}
- **Sector**: {sector}
- **Key Risk**: {first risk from memo}
- **Memo**: (full memo text below)
---
{full memo}
```

### 4. Compile the Morning Briefing

After all decks are analyzed, POST the compiled results to the briefing API:

```bash
curl -s -X POST "http://localhost:3001/api/briefing" \
  -H "Content-Type: application/json" \
  -d '{
    "deals": [
      {
        "companyName": "Acme Corp",
        "sender": "john@acme.com",
        "subject": "Series A Pitch Deck",
        "verdict": "BUY",
        "sector": "B2B SaaS",
        "keyRisk": "High burn rate relative to revenue",
        "summary": "AI-powered inventory management for mid-market retailers..."
      }
    ],
    "totalEmails": 15,
    "pitchDecksFound": 3,
    "date": "2026-03-14"
  }'
```

### 5. Send the Briefing via WhatsApp

Send the compiled briefing to the VC's WhatsApp. Format it like this:

```
☀️ MORNING DEAL FLOW BRIEFING
📅 Friday, March 14, 2026

📬 15 new emails scanned | 3 pitch decks found

━━━━━━━━━━━━━━━━━━━━━━━━━

🟢 TAKE MEETING (2)

 1️⃣ Acme Corp — BUY
    B2B SaaS · AI inventory mgmt
    From: john@acme.com
    ⚠️ Risk: High burn rate
    
 2️⃣ NovaTech — STRONG BUY
    FinTech · Payment infrastructure
    From: sarah@novatech.io
    ⚠️ Risk: Regulatory uncertainty

━━━━━━━━━━━━━━━━━━━━━━━━━

🔴 PASS (1)

 3️⃣ WidgetCo — PASS
    Consumer · Social commerce
    From: lead@widgetco.com
    ⚠️ Risk: No moat, commoditized market

━━━━━━━━━━━━━━━━━━━━━━━━━

💡 Reply with a company name for the full memo
📊 Powered by Diligent-AI
```

### 6. Mark Emails as Read

After processing, mark all analyzed emails as read in Gmail to prevent duplicate processing.

### 7. Log Execution

Update `memory/last-briefing-run.md`:
```markdown
Last run: 2026-03-14 07:00
Emails scanned: 15
Decks found: 3
Decks analyzed: 3
Verdicts: 1x STRONG BUY, 1x BUY, 1x PASS
```

## Edge Cases

- **No pitch decks found**: Send a short message — "☀️ No new pitch decks in your inbox today. Enjoy your coffee! ☕"
- **API server down**: Retry once after 5 minutes. If still down, notify VC and log error.
- **PDF too large** (>25MB): Skip and note in briefing — "⚠️ Skipped 1 deck (file too large). Subject: {subject}"
- **Duplicate company**: If a company was already analyzed (check `memory/deals/`), skip re-analysis and note: "ℹ️ {Company} was already analyzed on {date}"

## Follow-up Integration

After the briefing, if the VC replies with a company name, use the `deal-chat` skill to answer follow-up questions using the stored memo.

## Environment

- **API URL**: `http://localhost:3001` (override with `DILIGENT_API_URL` env var)
- **Gmail**: Must be configured during OpenClaw onboarding
- **WhatsApp**: Must be linked via QR code
