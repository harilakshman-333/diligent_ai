/**
 * OpenClaw Daemon — Main Entry Point
 * 
 * Starts the full OpenClaw runtime:
 *   1. WhatsApp Gateway (Baileys linked device)
 *   2. Gmail Inbox Crawler (IMAP)
 *   3. Heartbeat Scheduler (node-cron)
 * 
 * Usage:
 *   npx tsx openclaw/src/daemon.ts
 * 
 * Environment Variables (.env.local):
 *   ANTHROPIC_API_KEY     — Claude API key (used by Next.js API)
 *   GMAIL_USER            — Gmail address for inbox crawling
 *   GMAIL_APP_PASSWORD    — Google App Password (not regular password)
 *   DILIGENT_API_URL      — API base URL (default: http://localhost:3001)
 */

import * as cron from 'node-cron';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { WhatsAppGateway } from './whatsapp-gateway.js';
import { GmailCrawler } from './gmail-crawler.js';

// Load .env.local from the project root
const envPath = path.resolve(__dirname, '../../.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const MEMORY_DIR = path.join(process.env.HOME || '~', '.openclaw', 'workspace', 'memory');
fs.mkdirSync(MEMORY_DIR, { recursive: true });

// ─── Banner ─────────────────────────────────────────
console.log(`
╔══════════════════════════════════════════════╗
║       🦞  OpenClaw Daemon  v1.0.0           ║
║       Diligent-AI Gateway Runtime            ║
╠══════════════════════════════════════════════╣
║  WhatsApp Gateway  │  Baileys WebSocket      ║
║  Gmail Crawler     │  IMAP / App Password    ║
║  Heartbeat         │  07:00 AM daily         ║
╚══════════════════════════════════════════════╝
`);

// ─── Initialize Components ─────────────────────────
const whatsapp = new WhatsAppGateway();
const gmail = new GmailCrawler();

let briefingInProgress = false;

// ─── Morning Briefing Flow ─────────────────────────
async function runMorningBriefing(): Promise<void> {
  if (briefingInProgress) {
    console.log('⏳ Briefing already in progress, skipping...');
    return;
  }

  // Deduplication: check if we already ran today
  const today = new Date().toISOString().split('T')[0];
  const lastRunPath = path.join(MEMORY_DIR, 'last-briefing-run.md');
  if (fs.existsSync(lastRunPath)) {
    const lastRun = fs.readFileSync(lastRunPath, 'utf-8');
    if (lastRun.includes(today)) {
      console.log(`⏭️  Briefing already ran today (${today}). Skipping.`);
      return;
    }
  }

  briefingInProgress = true;
  console.log('\n🌅 ═══ MORNING DEAL FLOW BRIEFING ═══');
  console.log(`📅 ${today} | ${new Date().toLocaleTimeString()}\n`);

  try {
    // Step 1: Crawl Gmail inbox
    if (!gmail.isConfigured()) {
      console.log('⚠️  Gmail not configured — skipping inbox crawl');
      console.log('   Set GMAIL_USER and GMAIL_APP_PASSWORD in .env.local');
      briefingInProgress = false;
      return;
    }

    const { totalEmails, pitchDecksFound, analyses } = await gmail.crawlInbox();
    
    console.log(`\n📊 Results: ${totalEmails} emails scanned, ${pitchDecksFound} pitch decks found, ${analyses.length} analyzed`);

    // Step 2: Compile briefing
    const briefing = await gmail.compileBriefing(analyses, totalEmails, pitchDecksFound);
    
    if (briefing) {
      console.log('\n📋 Briefing compiled successfully');

      // Step 3: Send via WhatsApp
      if (whatsapp.isConnected()) {
        const sent = await whatsapp.sendBriefing(briefing);
        if (sent) {
          console.log('📱 Briefing delivered via WhatsApp');
        } else {
          console.log('⚠️  WhatsApp delivery failed — briefing available on dashboard');
        }
      } else {
        console.log('⚠️  WhatsApp not connected — briefing available on dashboard');
      }

      // Step 4: Log execution
      gmail.logBriefingRun(analyses.length);
      console.log(`\n✅ Morning briefing complete (${analyses.length} deals)\n`);
    }

    // Disconnect Gmail after crawl
    await gmail.disconnect();

  } catch (error: any) {
    console.error('❌ Morning briefing failed:', error.message);
    
    // Log error
    const errorLog = path.join(MEMORY_DIR, 'briefing-errors.md');
    fs.appendFileSync(errorLog, 
      `\n## ${today} ${new Date().toLocaleTimeString()}\nError: ${error.message}\n`
    );

    // Notify via WhatsApp if connected
    if (whatsapp.isConnected()) {
      await whatsapp.sendBriefing(
        `⚠️ *Morning Briefing Failed*\n\nError: ${error.message}\n\nCheck the dashboard for details.`
      );
    }
  } finally {
    briefingInProgress = false;
  }
}

// ─── Health Check ──────────────────────────────────
async function healthCheck(): Promise<void> {
  const DILIGENT_API_URL = process.env.DILIGENT_API_URL || 'http://localhost:3001';
  
  try {
    const response = await fetch(DILIGENT_API_URL, { 
      signal: AbortSignal.timeout(10000)
    });
    console.log(`💚 Health check OK — API server responding (${response.status})`);
  } catch {
    console.error('🔴 Health check FAILED — API server unreachable');

    // Log failure
    const healthLog = path.join(MEMORY_DIR, 'health-checks.md');
    fs.appendFileSync(healthLog,
      `\n- ${new Date().toISOString()} — FAILED: API unreachable\n`
    );
  }
}

// ─── Start Everything ──────────────────────────────
async function main(): Promise<void> {
  const DILIGENT_API_URL = process.env.DILIGENT_API_URL || 'http://localhost:3001';
  
  console.log('📡 Configuration:');
  console.log(`   API URL:    ${DILIGENT_API_URL}`);
  console.log(`   Gmail:      ${gmail.isConfigured() ? process.env.GMAIL_USER : '❌ Not configured'}`);
  console.log(`   WhatsApp:   Starting...`);
  console.log('');

  // 1. Start WhatsApp Gateway (non-blocking — daemon continues if it fails)
  whatsapp.on('connected', () => {
    console.log('📱 WhatsApp ready — VC can send pitch decks');
  });

  whatsapp.on('trigger-briefing', async () => {
    console.log('📬 Manual briefing triggered via WhatsApp');
    await runMorningBriefing();
  });

  whatsapp.on('analysis-complete', (data: any) => {
    console.log(`📊 Deal analyzed: ${data.company} → ${data.verdict}`);
  });

  whatsapp.on('give-up', () => {
    console.log('⚠️  WhatsApp unavailable — daemon continues with Gmail + dashboard only');
  });

  // Start WhatsApp in background so it doesn't block the daemon
  whatsapp.start().catch((err: any) => {
    console.log(`⚠️  WhatsApp failed to start: ${err.message}`);
    console.log('   Daemon continues with Gmail + Dashboard only.');
  });

  // 2. Schedule Morning Briefing (7:00 AM daily)
  cron.schedule('0 7 * * *', () => {
    console.log('\n⏰ Heartbeat trigger: Morning briefing');
    runMorningBriefing();
  }, {
    timezone: 'Europe/London', // Edinburgh timezone
  });
  console.log('⏰ Heartbeat scheduled: Morning briefing at 07:00 AM (Europe/London)');

  // 3. Schedule Health Checks (every 6 hours)
  cron.schedule('0 */6 * * *', () => {
    healthCheck();
  });
  console.log('💓 Health checks scheduled: every 6 hours');

  // 4. Initial health check
  await healthCheck();

  // 5. Test Gmail connectivity on startup
  if (gmail.isConfigured()) {
    console.log('\n📬 Testing Gmail connection...');
    const gmailConnected = await gmail.connect();
    if (gmailConnected) {
      console.log('✅ Gmail IMAP connection successful!');
      await gmail.disconnect();
    } else {
      console.log('❌ Gmail IMAP connection failed — check credentials in .env.local');
    }
  }

  console.log('\n🟢 OpenClaw daemon running. Press Ctrl+C to stop.\n');
  console.log('─'.repeat(50));
  console.log('Waiting for incoming pitch decks...');
  console.log('─'.repeat(50));
}

// ─── Graceful Shutdown ─────────────────────────────
process.on('SIGINT', async () => {
  console.log('\n\n🛑 Shutting down OpenClaw daemon...');
  await gmail.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await gmail.disconnect();
  process.exit(0);
});

// ─── Run ───────────────────────────────────────────
main().catch((error) => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
