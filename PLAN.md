# Diligent-AI — Build Plan

## Project Overview

Diligent-AI is an **automated due diligence platform** for Venture Capitalists with **three interfaces**:

1. **Web Dashboard** — Drag & drop pitch deck + financials → get Investment Memo
2. **WhatsApp "Coffee Shop" Flow** — Forward a PDF to OpenClaw via WhatsApp → get a memo back on your phone
3. **Proactive Inbox Crawler** — OpenClaw scans a VC's Gmail inbox every morning for pitch decks → sends a "Morning Deal Flow Briefing" before coffee

### Core Analysis Pipeline (shared by all 3 interfaces)

1. **Parse PDF** → Claude 3.5 Sonnet (native PDF input) extracts company name, product, competitor, market size
2. **Parse Financials** → Claude analyzes CSV/Excel for burn rate, revenue growth, runway
3. **Market Comps** → Financial Datasets API / MCP for live competitor multiples & risk factors
4. **Generate Memo** → Claude (Senior VC Partner persona) produces a structured Investment Memo

### PDF Parsing Strategy (No Wordsmith)

- **Primary: Claude PDF input** — Claude 3.5 Sonnet natively accepts PDF documents. Send pitch deck directly as base64, get structured JSON back. Zero extra dependencies.
- **Fallback: pdf-parse + Claude** — Use `pdf-parse` npm package to extract raw text, then send text to Claude for structured extraction.

## Tech Stack

- **Frontend**: Next.js (App Router), React, Tailwind CSS, shadcn/ui
- **Backend**: Next.js Server Actions / API Routes (Node.js)
- **AI/APIs**:
  - **Anthropic Claude Sonnet** — PDF parsing, financial analysis, memo generation (one model does it all)
  - **`pdf-parse`** npm package — fallback text extraction from oversized PDFs
  - **Yahoo Finance** (`yahoo-finance2`) — free live quotes, market cap, P/E, 52-week range
  - **Alpha Vantage** — free tier income statements, revenue growth, EPS
- **Fonts**: Inter (sans-serif) + JetBrains Mono (monospace)
- **Agent Platform**:
  - **OpenClaw** — autonomous AI agent with:
    - WhatsApp/Telegram messaging gateway (receives forwarded PDFs)
    - Gmail integration (reads VC inbox for pitch decks)
    - HEARTBEAT.md daemon loop (scheduled daily inbox scans — NOT cron)
    - Custom Skills (`SKILL.md` format) for routing to our analysis pipeline
    - Persistent memory (tracks deal history)
  - **SECURITY**: Built from verified GitHub source only — see Security Advisory below

---

## 🚨 Security Advisory: GhostClaw npm Supply Chain Attack (March 10, 2026)

> **Date**: March 10, 2026 — 4 days before this hackathon.
>
> A sophisticated malware campaign called **GhostLoader/GhostClaw** compromised the npm registry.
> Attackers pushed a fake package `@openclaw-ai/openclawai` masquerading as the official OpenClaw CLI.
> Additionally, the popular `cline` CLI was compromised via a poisoned `postinstall` script that
> secretly installs OpenClaw and opens backdoor gateways.

### What we did about it

1. **We do NOT use `npm install -g openclaw` or `curl | bash` installers** — these are the attack vectors.
2. **We clone directly from the verified GitHub repo** (`git clone https://github.com/openclaw/openclaw.git`) and build locally with `pnpm`.
3. **Gateway is bound strictly to `127.0.0.1`** — no external network exposure.
4. **No `sudo` or Full Disk Access granted** — GhostClaw triggers fake Keychain prompts to steal system passwords.

### Hackathon pitch angle

> *"Given the GhostClaw npm supply chain attacks from 4 days ago, we bypassed the global CLI installers,
> built OpenClaw directly from the verified GitHub source, and sandboxed the gateway to ensure
> enterprise-grade security for the VC's data."*
>
> — This proves we build **secure, production-ready AI**, not just a toy.

---

## Phase 1: Project Initialization & UI Shell ✅

- [x] Scaffold Next.js project with TypeScript, Tailwind, ESLint, App Router, src dir
- [x] Install shadcn/ui (button, card, skeleton, badge, separator) + lucide-react
- [x] Configure dark mode (class="dark" on html)
- [x] Build main layout:
  - Header with branding + badges
  - Left panel: drag-and-drop upload zones (PDF + CSV/Excel)
  - Right panel: Investment Memo canvas (empty / loading / rendered states)
  - Generate button (disabled until both files uploaded)

## Phase 2: File Handling & Mock API Setup ✅

- [x] Create `src/lib/mock-apis.ts` with mock functions:
  - `mockParsePitchDeck(pdfFile)` → `{ companyName, product, mainCompetitor, marketSize }`
  - `mockFinancialData(ticker)` → `{ ticker, currentMultiple, recentRisk }`
  - `mockParseFinancials(spreadsheetFile)` → `{ monthlyBurnRate, revenueGrowth, runway, lastMonthRevenue }`
- [x] Create `POST /api/upload` route that:
  - Accepts multipart form data (pitchDeck + financials)
  - Validates file types server-side
  - Calls all three mock APIs
  - Returns combined JSON response

## Phase 3: The Claude Reasoning Engine ✅

- [x] Install `@anthropic-ai/sdk`, `pdf-parse`, `yahoo-finance2` + configure `.env.local`
- [x] Create `src/lib/pdf-parser.ts` — Claude-powered PDF pitch deck parser:
  - Sends PDF as base64 document to Claude Sonnet (primary path)
  - Extracts: companyName, product, sector, mainCompetitors[], marketSize, askAmount, teamHighlights, keyMetricsClaimed, summary
  - Fallback: `pdf-parse` `PDFParse.getText()` for oversized PDFs → send text to Claude
- [x] Create `src/lib/memo-generator.ts` — Claude-powered spreadsheet analyzer + memo writer:
  - `parseFinancials()`: reads CSV/Excel as text → Claude extracts burn rate, revenue growth, runway
  - `generateMemo()`: combines pitch data + financials + market comps → full Investment Memo
- [x] Create `src/lib/financial-data.ts` — dual market data source:
  - Yahoo Finance: live quotes, market cap, P/E, 52-week range, revenue growth
  - Alpha Vantage: annual income statements, net income, EPS, YoY revenue growth
  - Both run in parallel via `Promise.all` for up to 5 competitor tickers
- [x] Create `POST /api/generate-memo` route:
  - Receives uploaded files (pitchDeck PDF + financials CSV/Excel)
  - Step 1: Parse pitch deck with Claude
  - Step 2: Parse financials with Claude
  - Step 3: Fetch market comps from Yahoo Finance + Alpha Vantage
  - Step 4: Generate Investment Memo via Claude (Senior VC Partner persona)
  - Returns structured Markdown
- [x] Memo sections:
  - Executive Summary (with STRONG BUY / BUY / HOLD / PASS rating)
  - Company Overview
  - Market Opportunity (cross-referenced with public market data)
  - Competitive Landscape (real comparables from Yahoo/AV)
  - Financial Analysis (burn rate, runway vs. industry benchmarks)
  - Risk Factors (top 3-5)
  - Investment Recommendation

## Phase 4: Integration & Polish ✅

- [x] Wire frontend `handleGenerate` → `POST /api/generate-memo` (FormData with pitchDeck + financials)
- [x] Add color-coded loading stepper (violet/emerald/blue/amber spinners)
- [x] Render Markdown output with `react-markdown` + `remark-gfm` + `@tailwindcss/typography`
- [x] Professional UI overhaul: Inter font, hero section, gradient headline, wider layout, footer
- [x] End-to-end pipeline: upload files → parse PDF → parse financials → fetch market data → generate memo → render markdown

## Phase 5: OpenClaw — WhatsApp "Coffee Shop" Deal Flow ✅

> VC is at a coffee shop, gets a pitch deck via email, forwards the PDF to their OpenClaw WhatsApp number. Three minutes later, they get a formatted investment memo right on their phone.

- [x] Set up OpenClaw agent instance with WhatsApp messaging gateway
  - Created `openclaw/SETUP.md` — **UPDATED for GhostClaw-safe install** (git clone + pnpm, NOT npm/curl)
  - WhatsApp uses Baileys WebSocket — NO Meta Business API registration needed
  - QR pairing: `pnpm openclaw onboard` → select "WhatsApp (QR link)" → scan from phone
- [x] Create OpenClaw Skill (`SKILL.md`):
  - Created `openclaw/skills/analyze-pitch-deck/SKILL.md`
  - AgentSkills-compatible format with YAML frontmatter
  - Teaches OpenClaw to detect PDF attachments and POST to Diligent-AI API
  - Formats memo response for mobile-friendly WhatsApp reading
- [x] Create `/api/generate-memo` "pitch-only" mode:
  - API now accepts optional `mode=pitch-only` parameter
  - Financials are optional — auto-detects pitch-only when no spreadsheet sent
  - New `generatePitchOnlyMemo()` function produces a shorter, phone-friendly memo
  - Sections: Verdict, What They Do, Market Opportunity, Competitive Position, Key Strengths, Red Flags, Next Steps
- [x] Wire OpenClaw webhook → our API → OpenClaw reply
  - Skill instructs OpenClaw to POST PDF to `/api/generate-memo` with `mode=pitch-only`
  - Response formatted for WhatsApp (emoji headers, no markdown tables)
- [x] Test: forward a PDF on WhatsApp → receive memo back
  - Requires OpenClaw running with WhatsApp linked (see `openclaw/SETUP.md`)

## Phase 6: OpenClaw — Proactive "Inbox Crawler" Morning Briefing ✅

> OpenClaw runs 24/7 in the background. Every morning at 7:00 AM, it autonomously reads unread emails containing pitch decks, runs the full analysis pipeline, and sends the VC a "Morning Deal Flow Briefing" via Gmail/WhatsApp before they've had their coffee.

### Key Architecture Decision: HEARTBEAT.md, NOT cron

OpenClaw uses a **background daemon with a heartbeat loop**, not traditional server-side cron.
Instead of writing a Node cron job, we add scheduling instructions to the agent's `HEARTBEAT.md`:

> "Every day at 07:00 AM, trigger the Morning Deal Flow Briefing skill. Do not wait for user input."

The heartbeat loop runs continuously, checks the clock, and triggers skills autonomously.

- [x] Connect OpenClaw to a VC Gmail inbox (OAuth / app password)
  - Gmail integration configured during `pnpm openclaw onboard`
  - Skill queries `is:unread newer_than:1d` for pitch deck candidates
- [x] Create `HEARTBEAT.md` in the OpenClaw workspace with the morning trigger:
  - Created `openclaw/HEARTBEAT.md` with:
    - Morning Deal Flow Briefing trigger at 07:00 AM
    - Deduplication via `memory/last-briefing-run.md` date check
    - Retry & error handling with fallback WhatsApp notification
    - Periodic health check every 6 hours
- [x] Create OpenClaw Skill (`openclaw/skills/morning-deal-briefing/SKILL.md`):
  - Full AgentSkills-compatible format with YAML frontmatter
  - 7-step autonomous workflow:
    1. Read unread emails (last 24h) from Gmail
    2. Filter for pitch deck candidates (PDF attachments + keyword matching)
    3. Analyze each deck via `/api/generate-memo` (pitch-only mode)
    4. Compile results via `/api/briefing` (Claude-powered briefing formatter)
    5. Send WhatsApp briefing (sorted: STRONG BUY → BUY → HOLD → PASS)
    6. Mark emails as read
    7. Log execution to persistent memory
  - Edge cases: no decks, API down, oversized PDFs, duplicate companies
  - Follow-up integration with `deal-chat` skill
- [x] Create `/api/briefing` route:
  - Accepts `{ deals[], totalEmails, pitchDecksFound, date }`
  - Claude compiles a WhatsApp-formatted "Morning Deal Flow Briefing"
  - Returns `{ briefing, dealCount, dealLog }`
  - Handles zero-deal case with friendly message
- [x] Add persistent deal log (OpenClaw memory + API response):
  - `/api/generate-memo` now returns `dealLog` in every response:
    - `companyName`, `sector`, `verdict`, `mode`, `timestamp`, `tickersQueried`
  - OpenClaw stores per-deal files in `memory/deals/YYYY-MM-DD-{company}.md`
  - Briefing execution logged to `memory/last-briefing-run.md`
  - Avoid re-analyzing the same deck twice
- [ ] Test: send test emails to the VC inbox → verify morning briefing arrives

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    DILIGENT-AI                          │
├─────────────┬──────────────────┬────────────────────────┤
│  Interface  │   Entry Point    │   Output               │
├─────────────┼──────────────────┼────────────────────────┤
│ Web App     │ Drag & Drop UI   │ Memo on dashboard      │
│ WhatsApp    │ Forward PDF      │ Memo via WhatsApp      │
│ Inbox Scan  │ Cron job (7AM)   │ Briefing via Gmail/WA  │
└─────┬───────┴────────┬─────────┴──────────┬─────────────┘
      │                │                    │
      ▼                ▼                    ▼
┌─────────────────────────────────────────────────────────┐
│              Shared Analysis Pipeline                    │
│                                                         │
│  PDF ──► Claude 3.5 ──► Structured Data                 │
│  CSV ──► Claude 3.5 ──► Financial Metrics               │
│  Ticker ► Financial Datasets API ──► Market Comps       │
│                                                         │
│  All Data ──► Claude (VC Partner) ──► Investment Memo   │
└─────────────────────────────────────────────────────────┘
│                                                         │
│  OpenClaw Agent Layer                                   │
│  ├── WhatsApp Gateway (receives PDFs)                   │
│  ├── Gmail Integration (reads inbox)                    │
│  ├── Cron Scheduler (morning briefing)                  │
│  ├── Custom Skills (SKILL.md)                           │
│  └── Persistent Memory (deal log)                       │
└─────────────────────────────────────────────────────────┘
```

## Build Order for Hackathon

| Priority | Phase | Status | Why this order |
|----------|-------|--------|----------------|
| 1 | Phase 1: UI Shell | ✅ Done | Foundation |
| 2 | Phase 2: Mock APIs | ✅ Done | Testable endpoints |
| 3 | Phase 3: Claude Engine | ✅ Done | Core value — makes the app actually work |
| 4 | Phase 4: Web Integration | ✅ Done | Connects UI to engine |
| 5 | Phase 5: WhatsApp Flow | ✅ Done | WOW factor demo — "forward a PDF, get a memo" |
| 6 | Phase 6: Inbox Crawler | 🔜 Next | Most impressive — autonomous agent running 24/7 |
