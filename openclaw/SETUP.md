# OpenClaw Setup Guide for Diligent-AI

## 🚨 SECURITY NOTICE (March 10, 2026)

**DO NOT run `npm install -g openclaw`, `curl | bash`, or install `@openclaw-ai/openclawai` from npm.**

The GhostLoader/GhostClaw malware campaign compromised the npm registry. A fake
package masquerading as the OpenClaw CLI was published, and the `cline` CLI was
poisoned to secretly install OpenClaw backdoors via `postinstall` scripts.

**We build from the verified GitHub source only.** See steps below.

If your terminal asks for your Mac password / Keychain access during setup, **STOP IMMEDIATELY** — that is the GhostClaw privilege escalation prompt.

---

## Prerequisites

- Node.js 22+ (already installed via nvm)
- pnpm (`npm install -g pnpm` or `corepack enable`)
- Git
- A spare phone number for WhatsApp (recommended) or your personal number
- The Diligent-AI server running (`npm run dev` on port 3001)

## 1. Install OpenClaw from Verified GitHub Source

```bash
# Clone the OFFICIAL repo — verified at https://github.com/openclaw/openclaw
git clone https://github.com/openclaw/openclaw.git ~/openclaw
cd ~/openclaw

# Verify the repo (check latest commit, author = steipete / openclaw org)
git log --oneline -5

# Install dependencies with pnpm (as per official docs, updated March 14, 2026)
pnpm install

# Build locally
pnpm build
```

**DO NOT use `sudo` at any point.** If asked for elevated privileges, something is wrong.

## 2. Run the Onboarding Wizard

```bash
cd ~/openclaw
pnpm openclaw onboard --install-daemon
```

This configures:
- Your AI provider (Anthropic Claude — use the same API key from `.env.local`)
- Gateway settings
- Optional channels

## 3. Lock the Gateway to localhost

Edit `~/.openclaw/openclaw.json` and ensure the gateway is bound to `127.0.0.1`:

```json
{
  "gateway": {
    "host": "127.0.0.1",
    "port": 18789
  },
  "channels": {
    "whatsapp": {
      "dmPolicy": "pairing",
      "allowFrom": ["+YOUR_PHONE_NUMBER"],
      "ackReaction": {
        "emoji": "📊",
        "direct": true,
        "group": "never"
      }
    }
  }
}
```

Replace `+YOUR_PHONE_NUMBER` with your actual phone number in E.164 format (e.g., `+447700900123`).

**Critical:** The `"host": "127.0.0.1"` line ensures the gateway is NOT exposed to the network. This is essential for hackathon security.

## 4. Link WhatsApp via QR Code (Baileys — No Meta Business API)

Do NOT try to register a Meta Business App. OpenClaw uses the Baileys WebSocket
library, which mimics WhatsApp Web. You just scan a QR code.

```bash
cd ~/openclaw
pnpm openclaw channels login --channel whatsapp
```

This renders a **QR code in your terminal**. On your phone:
1. Open WhatsApp → Settings → Linked Devices → Link a Device
2. Scan the QR code on your computer screen
3. Done. You have a working WhatsApp AI agent in 30 seconds.

## 5. Install the Diligent-AI Skill

Copy the skill into OpenClaw's managed skills directory:

```bash
cp -r /path/to/diligent-ai/openclaw/skills/analyze-pitch-deck ~/.openclaw/skills/
```

Or symlink it for development (changes auto-reload):

```bash
ln -s "$(pwd)/openclaw/skills/analyze-pitch-deck" ~/.openclaw/skills/analyze-pitch-deck
```

## 6. Set the API URL

If the Diligent-AI server is running locally:

```bash
# Add to your shell profile or set in openclaw config
export DILIGENT_API_URL="http://localhost:3001"
```

For a deployed server, use the public URL.

## 7. Start the Gateway (localhost-bound)

```bash
cd ~/openclaw
pnpm openclaw gateway
```

Verify it's bound to localhost:
```bash
ss -tlnp | grep 18789
# Should show 127.0.0.1:18789, NOT 0.0.0.0:18789
```

## 8. Approve Pairing (First Time)

When you first message the OpenClaw WhatsApp number, it will show a pairing request:

```bash
cd ~/openclaw
pnpm openclaw pairing list whatsapp
pnpm openclaw pairing approve whatsapp <CODE>
```

## 9. Test It!

1. Make sure the Diligent-AI dev server is running: `npm run dev`
2. Send a PDF pitch deck to your OpenClaw WhatsApp number
3. Wait ~30 seconds for the analysis
4. Receive your investment memo right on your phone!

## Architecture

```
Phone (WhatsApp)
    │
    ▼
OpenClaw Gateway (Baileys WebSocket, bound to 127.0.0.1:18789)
    │
    ▼
Analyze Pitch Deck Skill (SKILL.md)
    │
    ▼ POST /api/generate-memo (mode=pitch-only)
    │
Diligent-AI Server (Next.js, localhost:3001)
    ├── Claude: Parse PDF pitch deck
    ├── Yahoo Finance + Alpha Vantage: Market comps
    └── Claude: Generate investment memo
    │
    ▼
OpenClaw → WhatsApp reply with formatted memo
```

## Troubleshooting

- **WhatsApp not connecting**: Run `pnpm openclaw channels login --channel whatsapp` from `~/openclaw` to re-pair
- **Skill not detected**: Run `pnpm openclaw gateway` in foreground to see skill loading logs
- **API timeout**: The full analysis takes 15-30s. WhatsApp may show typing indicator during this time.

---

## Quick Start: Integrated Daemon (WhatsApp + Gmail + Heartbeat)

The built-in OpenClaw daemon runs WhatsApp Gateway, Gmail Inbox Crawler, and the 7 AM Morning Briefing scheduler **all in one process** — no external OpenClaw install required.

### Step 1: Configure Gmail (App Password)

1. Go to your Gmail account → Security → 2-Step Verification (must be ON)
2. Visit https://myaccount.google.com/apppasswords
3. Generate an App Password for "Diligent-AI"
4. Add to `.env.local`:

```bash
GMAIL_USER=harilakshmanrb@gmail.com
GMAIL_APP_PASSWORD=nswn zlrx jfuv hblu

```

⚠️ **Never use your real Gmail password.** App Passwords are 16-character codes generated by Google.

### Step 2: Start the Daemon

```bash
# Make sure the Next.js dev server is running first:
npm run dev -- --port 3001

# Then in a SECOND terminal, start the OpenClaw daemon:
npm run openclaw
```

### What happens:

1. **WhatsApp QR Code** appears in the terminal — scan it with your phone
2. **Gmail IMAP** connects and starts monitoring your inbox
3. **Heartbeat** schedules the morning briefing at 07:00 AM (Europe/London)
4. The daemon stays running, listening for:
   - Incoming WhatsApp PDFs → auto-analyze
   - Manual "check inbox" command via WhatsApp
   - 7 AM trigger → crawl Gmail → compile briefing → send via WhatsApp

### Step 3: Check Status

```bash
curl http://localhost:3001/api/openclaw/status | python3 -m json.tool
```

Returns WhatsApp link status, Gmail config, last briefing run, and analyzed deal count.
- **"No active listener" error**: Make sure `pnpm openclaw gateway` is running
- **Terminal asks for Mac password / Keychain access**: STOP. This is the GhostClaw malware. Kill the process, delete `~/.openclaw`, and re-clone from GitHub.
- **Gateway binding to 0.0.0.0**: Check `~/.openclaw/openclaw.json` — `gateway.host` must be `"127.0.0.1"`

## Security Checklist

- [ ] OpenClaw installed via `git clone` from `github.com/openclaw/openclaw` (NOT npm / curl)
- [ ] Built locally with `pnpm install && pnpm build`
- [ ] Gateway bound to `127.0.0.1:18789` (verified with `ss -tlnp | grep 18789`)
- [ ] No `sudo` used during any setup step
- [ ] No `@openclaw-ai/openclawai` package in `node_modules`

---

## WhatsApp Cloud API (Alternative to Baileys)

> **Why?** Baileys (the reverse-engineered WhatsApp Web library) is periodically blocked by WhatsApp servers (405 protocol errors). The WhatsApp Cloud API is Meta's **official** API — stable, supported, and production-grade.

### Prerequisites

1. A **Meta Developer Account**: https://developers.facebook.com
2. A **Meta Business Account**: Created automatically when you register a WhatsApp Business app
3. A **phone number** not currently registered on WhatsApp (or the ability to receive a verification code)

### Step 1: Create a WhatsApp Business App

1. Go to https://developers.facebook.com/apps
2. Click **Create App** → Select **Business** → Next
3. App name: `Diligent-AI WhatsApp` → Create App
4. On the dashboard, find **WhatsApp** and click **Set Up**
5. Select or create a **Meta Business Account**

### Step 2: Get Your Credentials

From the WhatsApp App dashboard:

1. **Temporary Access Token** — copy it (valid 24 hours; generate a permanent one later)
2. **Phone Number ID** — from the test number Meta provides
3. **WhatsApp Business Account ID** — from settings

Add to `.env.local`:

```bash
WHATSAPP_TOKEN=your_temp_or_permanent_token
WHATSAPP_PHONE_ID=your_phone_number_id
WHATSAPP_BUSINESS_ID=your_business_account_id
WHATSAPP_VERIFY_TOKEN=diligent-ai-verify-2026   # a random string you choose
```

### Step 3: Set Up the Webhook

Meta needs a publicly accessible HTTPS URL to send incoming messages to. Options:

**Option A: ngrok (for local dev)**
```bash
ngrok http 3001
# Copy the https://xxxx.ngrok.io URL
```

**Option B: Deploy to Vercel/Railway**
Deploy the app and use the production URL.

Then in Meta Developer Console:
1. Go to **WhatsApp > Configuration > Webhooks**
2. Callback URL: `https://your-url/api/openclaw/whatsapp-webhook`
3. Verify Token: the same `WHATSAPP_VERIFY_TOKEN` from `.env.local`
4. Subscribe to: `messages`

### Step 4: Send Messages via Cloud API

```typescript
// Send a text message via WhatsApp Cloud API
const response = await fetch(
  `https://graph.facebook.com/v21.0/${PHONE_ID}/messages`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: recipientPhoneNumber,
      type: 'text',
      text: { body: 'Your morning briefing...' },
    }),
  }
);
```

### Architecture (Cloud API)

```
Phone (WhatsApp)
    │
    ▼
Meta Cloud API (graph.facebook.com)
    │ Webhook POST
    ▼
Diligent-AI Server (Next.js, localhost:3001 via ngrok)
    ├── /api/openclaw/whatsapp-webhook (receive messages)
    ├── /api/generate-memo (analyze pitch deck)
    └── Send reply via graph.facebook.com
    │
    ▼
Reply appears in WhatsApp conversation
```

### Cost

- **1,000 free conversations per month** (service conversations)
- No cost for user-initiated conversations within 24h window
- Business-initiated messages: ~$0.005 per message (varies by region)

### When to Use Cloud API vs Baileys

| Feature | Baileys | Cloud API |
|---------|---------|-----------|
| Setup | QR scan | Meta developer account |
| Stability | Breaks when WhatsApp updates | Stable, official |
| Cost | Free | Free tier (1000 convos/mo) |
| Webhook | Not needed | Required (ngrok or deploy) |
| Media | Direct access | Download via Meta CDN |
| Rate limits | Undocumented | 80 msgs/sec |
