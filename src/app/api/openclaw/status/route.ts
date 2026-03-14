/**
 * OpenClaw Status API
 * 
 * GET /api/openclaw/status — Returns daemon configuration status
 * POST /api/openclaw/briefing — Triggers a manual briefing run
 */

import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

const MEMORY_DIR = path.join(process.env.HOME || '~', '.openclaw', 'workspace', 'memory');
const DEALS_DIR = path.join(MEMORY_DIR, 'deals');

export async function GET() {
  // Check Gmail configuration
  const gmailConfigured = Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);

  // Check WhatsApp auth state  
  const waAuthDir = path.join(process.env.HOME || '~', '.openclaw', 'auth', 'whatsapp');
  const whatsappLinked = fs.existsSync(waAuthDir) && fs.readdirSync(waAuthDir).length > 0;

  // Check last briefing run
  let lastBriefing = null;
  const lastRunPath = path.join(MEMORY_DIR, 'last-briefing-run.md');
  if (fs.existsSync(lastRunPath)) {
    const content = fs.readFileSync(lastRunPath, 'utf-8');
    const dateMatch = content.match(/\*\*Date\*\*:\s*(.+)/);
    const timeMatch = content.match(/\*\*Time\*\*:\s*(.+)/);
    const dealsMatch = content.match(/\*\*Deals Analyzed\*\*:\s*(\d+)/);
    lastBriefing = {
      date: dateMatch?.[1]?.trim(),
      time: timeMatch?.[1]?.trim(),
      dealsAnalyzed: parseInt(dealsMatch?.[1] || '0'),
    };
  }

  // Count analyzed deals
  let totalDeals = 0;
  const recentDeals: string[] = [];
  if (fs.existsSync(DEALS_DIR)) {
    const files = fs.readdirSync(DEALS_DIR).filter(f => f.endsWith('.md')).sort().reverse();
    totalDeals = files.length;
    recentDeals.push(...files.slice(0, 5).map(f => f.replace('.md', '')));
  }

  return NextResponse.json({
    openclaw: {
      version: '1.0.0',
      gmail: {
        configured: gmailConfigured,
        user: gmailConfigured ? process.env.GMAIL_USER : null,
      },
      whatsapp: {
        linked: whatsappLinked,
      },
      heartbeat: {
        morningBriefing: '07:00 AM Europe/London',
        healthCheck: 'Every 6 hours',
      },
      lastBriefing,
      deals: {
        total: totalDeals,
        recent: recentDeals,
      },
    },
  });
}
