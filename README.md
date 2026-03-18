
# Diligent-AI: Automated VC Due Diligence Platform

<p align="center">
  <img src="public/logo.png" alt="Diligent-AI Logo" width="120" />
</p>

<p align="center">
  <b>Automate, Accelerate, and Elevate Your VC Due Diligence</b><br>
  <i>AI-powered investment memo generation, legal/cap table scan, founder intelligence, and deal flow analysis.</i>
</p>

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Backend & Data Flow](#backend--data-flow)
- [Getting Started](#getting-started)
- [Deployment](#deployment)
- [License](#license)

---


---

## Overview

Diligent-AI is a next-generation platform for automating venture capital due diligence. Built for the Edinburgh AI Hackathon 2026, it leverages state-of-the-art LLMs (Google Gemini, Anthropic Claude, GPT-4.1) and modern web technologies to streamline investment memo generation, legal/cap table scans, founder intelligence, and deal flow analysis.

---

## Key Features

- **Automated Investment Memo Generation:** Instantly create detailed memos from pitch decks and financials.
- **Legal & Cap Table Scan:** Detect IP issues, financial discrepancies, cap table red flags, and missing documents.
- **Founder Intelligence:** Research founders using LLMs, web search, and registry checks.
- **Deal Flow Monitoring:** Integrate with Gmail and Telegram for automated deal sourcing and briefings.
- **Multi-Model Chatbot:** Live Q&A with Gemini, Claude, and GPT-4.1.
- **Modern UI:** Responsive, dark mode, markdown rendering, and animated canvas for Monitor AI.

---

## Architecture

**Tech Stack:**

- Next.js 16.1.6 (App Router, TypeScript, Tailwind CSS v4, shadcn/ui)
- Node.js v22
- LLM APIs: Google Gemini, Anthropic Claude, GPT-4.1 (Copilot)
- PDF/CSV/Excel parsing
- Vercel, Docker, GitHub Actions

**Directory Structure:**

- `src/app/api/` — Next.js API routes (chat, memo, legal scan, founder intel, research)
- `src/lib/` — Core logic (LLM integration, PDF parsing, memo generation, legal scan, founder intel)
- `openclaw/` — Daemon for Gmail/Telegram integration
- `public/mock-data/` — Sample pitch decks and financials
- `.env.local` — API keys and credentials

---

## Backend & Data Flow

### System Overview

Diligent-AI uses a modular backend built on Next.js API routes and Node.js services. The backend orchestrates LLM calls, document parsing, legal/cap table scans, founder intelligence, and integrates with external APIs (Gmail, Telegram, Yahoo Finance, Alpha Vantage).

### Data Flow Diagram

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

### Key Components

- **API Routes:** Validate input, orchestrate logic, and return JSON/markdown.
- **LLM Integration:** Abstracts calls to Gemini, Claude, and GPT-4.1. Handles prompt formatting, model selection, and response parsing.
- **PDF/CSV Parsing:** Extracts text and financials from uploaded documents for downstream LLM analysis.
- **Legal Scan:** Structured prompt chain to detect IP issues, financial discrepancies, cap table flags, and missing documents.
- **Founder Intel:** LLMs with web search grounding to research founders, check registries, and screen for adverse media.
- **OpenClaw Daemon:** Handles Gmail IMAP crawling, Telegram bot integration, and automated deal flow briefings.
- **External APIs:** Google Gemini, Anthropic Claude, OpenAI GPT-4.1, Yahoo Finance, Alpha Vantage, Gmail, Telegram.

### Security & Networking

- Cloud deployment (Vercel, Docker, or custom server). No static IPs required unless outbound API calls are restricted.
- All LLM and data API calls are outbound HTTPS requests to vendor endpoints.
- No sensitive data is stored server-side; all processing is ephemeral per request.

### Example Data Flow

1. User uploads a pitch deck PDF and financials via the web UI.
2. Next.js API route receives the files, parses them, and sends extracted text/financials to the LLM integration layer.
3. LLM (Gemini/Claude) generates an investment memo and legal scan.
4. Results are returned to the frontend for display and further Q&A.
5. Optionally, OpenClaw daemon fetches new deals from Gmail and posts briefings to Telegram.

---

## Getting Started

1. **Clone the repository:**
	 ```bash
	 git clone https://github.com/harilakshman-333/diligent_ai.git
	 cd diligent-ai
	 ```
2. **Install dependencies:**
	 ```bash
	 npm install
	 # or
	 yarn install
	 ```
3. **Configure environment variables:**
	 - Copy `.env.example` to `.env.local` and fill in your API keys (Gemini, Claude, OpenAI, Yahoo, Alpha Vantage, Gmail, Telegram).
4. **Run the development server:**
	 ```bash
	 npm run dev -- --port 3001
	 ```
5. **Open the app:**
	 - Visit [http://localhost:3001](http://localhost:3001) in your browser.

---

## Deployment

- **Vercel:**
	- Push to GitHub and connect your repo to [Vercel](https://vercel.com/).
- **Docker:**
	- Build and run the Docker container for custom deployments.
- **GitHub Actions:**
	- Automated CI/CD for testing and deployment.

---

## License

MIT. See [LICENSE](LICENSE) for details.

---

<p align="center">
	<i>Built for the Edinburgh AI Hackathon 2026</i>
</p>
