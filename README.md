## Table of Contents

- [Diligent-AI: Automated VC Due Diligence Platform](#diligent-ai-automated-vc-due-diligence-platform)
	- [Technical Overview](#technical-overview)
	- [Key Features](#key-features)
	- [Architecture](#architecture)
	- [Getting Started](#getting-started)
	- [For More Details](#for-more-details)
- [Backend Architecture & Data Flow](#backend-architecture--data-flow)
	- [Overview](#overview)
	- [Data Flow](#data-flow)
	- [Key Components](#key-components)
	- [Networking & IP](#networking--ip)
	- [Example Data Flow](#example-data-flow)

### Backend Architecture & Data Flow

#### Overview
Diligent-AI uses a modular backend built on Next.js API routes and Node.js services. The backend orchestrates LLM calls, PDF/CSV parsing, legal/cap table scans, founder intelligence, and integrates with external APIs (Gmail, Telegram, Yahoo Finance, Alpha Vantage).

#### Data Flow

```mermaid
flowchart TD
	A[User (Web/Telegram)] -->|UI/API Request| B[Next.js API Route]
	B -->|PDF/CSV Upload| C[PDF/Financial Parser]
	B -->|Chat/Memo/Scan| D[LLM Integration Layer]
	D -->|Prompt| E1[Google Gemini API]
	D -->|Prompt| E2[Anthropic Claude API]
	D -->|Prompt| E3[GPT-4.1 (Copilot Chat)]
	B -->|Legal/Cap Table| F[Legal Scan Engine]
	B -->|Founder Intel| G[Web Search/Registry]
	B -->|Market Data| H[Yahoo Finance/Alpha Vantage]
	B -->|Gmail/Telegram| I[OpenClaw Daemon]
	I -->|Email| J[Gmail IMAP]
	I -->|Bot| K[Telegram API]
	B -->|Response| A
```

#### Key Components
- **API Routes (`src/app/api/`)**: Handle requests for chat, memo generation, legal scan, founder intel, research, and briefings. Each route validates input, orchestrates logic, and returns JSON/markdown.
- **LLM Integration (`src/lib/gemini.ts`, `src/lib/legal-scan.ts`, etc.)**: Abstracts calls to Gemini, Claude, and GPT-4.1. Handles prompt formatting, model selection, and response parsing.
- **PDF/CSV Parsing (`src/lib/pdf-parser.ts`, `src/lib/memo-generator.ts`)**: Extracts text and financials from uploaded documents for downstream LLM analysis.
- **Legal Scan (`src/lib/legal-scan.ts`)**: Runs a structured prompt chain to detect IP issues, financial discrepancies, cap table flags, and missing documents.
- **Founder Intel (`src/lib/founder-intel.ts`)**: Uses LLMs with web search grounding to research founders, check registries, and screen for adverse media.
- **OpenClaw Daemon (`openclaw/`)**: Handles Gmail IMAP crawling, Telegram bot integration, and automated deal flow briefings.
- **External APIs**: Google Gemini, Anthropic Claude, OpenAI GPT-4.1, Yahoo Finance, Alpha Vantage, Gmail, Telegram.

#### Networking & IP
- The app is designed for cloud deployment (Vercel, Docker, or custom server). No static IPs are required unless you restrict outbound API calls.
- All LLM and data API calls are outbound HTTPS requests to vendor endpoints (Gemini, Claude, OpenAI, Yahoo, Alpha Vantage, Gmail, Telegram).
- No sensitive data is stored server-side; all processing is ephemeral per request.

#### Example Data Flow
1. User uploads a pitch deck PDF and financials via the web UI.
2. Next.js API route receives the files, parses them, and sends extracted text/financials to the LLM integration layer.
3. LLM (Gemini/Claude) generates an investment memo and legal scan.
4. Results are returned to the frontend for display and further Q&A.
5. Optionally, OpenClaw daemon fetches new deals from Gmail and posts briefings to Telegram.

---
## Diligent-AI: Automated VC Due Diligence Platform

Diligent-AI is an advanced platform for venture capital due diligence, built for the Edinburgh AI Hackathon 2026. It automates investment memo generation, legal and cap table scans, founder intelligence, and deal flow analysis using LLMs (Google Gemini, Claude, GPT-4.1) and modern web technologies.

### Technical Overview
- **Framework:** Next.js 16.1.6 (App Router, TypeScript, Tailwind CSS v4, shadcn/ui)
- **Backend:** Node.js v22, API routes for chat, memo generation, legal scan, founder intel, briefing, research
- **LLM Integration:** Google Gemini API, Anthropic Claude, GPT-4.1 (via Copilot Chat)
- **PDF & Financials:** Native PDF parsing, CSV/Excel financial extraction, investment memo synthesis
- **Legal & Cap Table Scan:** IP flag detection, financial cross-validation, cap table red flags, missing document checklist
- **Founder Intel:** Web search grounding, company registry checks, adverse media screening
- **Deal Flow:** Gmail IMAP integration, Telegram bot, automated morning briefings
- **UI:** React, Tailwind, shadcn/ui, animated canvas for Monitor AI
- **Deployment:** Vercel, Docker, GitHub Actions

### Key Features
- Automated investment memo generation from pitch decks and financials
- Legal and compliance scan (IP, financial discrepancies, cap table, missing docs)
- Founder background checks with web search and registry verification
- Live chatbot for VC/finance Q&A (multi-model)
- Deal flow monitoring (Gmail, Telegram, market research)
- Modern, responsive UI with dark mode and markdown rendering

### Architecture
- **src/app/api/**: Next.js API routes for chat, memo, legal scan, founder intel, briefing, research
- **src/lib/**: Core logic for PDF parsing, memo generation, legal scan, founder intel, Gemini/Claude integration
- **openclaw/**: Daemon and gateways for Gmail/Telegram integration
- **public/mock-data/**: Sample pitch decks and financials for testing
- **.env.local**: API keys and credentials

### Getting Started
Run the development server:

```bash
npm run dev -- --port 3001
```

Open [http://localhost:3001](http://localhost:3001) to view the app.

### For More Details
- See code comments in src/lib and src/app/api for prompt engineering and LLM integration.
- For deployment, see Vercel and Docker instructions.

---
This project was built for the Edinburgh AI Hackathon 2026.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
