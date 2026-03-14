/**
 * Gmail Scan History API
 * 
 * GET /api/openclaw/history — Returns scan history and deal summaries
 */

import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

const MEMORY_DIR = path.join(process.env.HOME || '~', '.openclaw', 'workspace', 'memory');
const SCANS_DIR = path.join(MEMORY_DIR, 'scans');
const DEALS_DIR = path.join(MEMORY_DIR, 'deals');

export async function GET() {
  // Ensure directories exist
  fs.mkdirSync(SCANS_DIR, { recursive: true });
  fs.mkdirSync(DEALS_DIR, { recursive: true });

  // Load scan history (newest first)
  const scanFiles = fs.existsSync(SCANS_DIR)
    ? fs.readdirSync(SCANS_DIR).filter(f => f.endsWith('.json')).sort().reverse()
    : [];

  const scans = scanFiles.slice(0, 50).map(file => {
    try {
      const content = fs.readFileSync(path.join(SCANS_DIR, file), 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }).filter(Boolean);

  // Load deal memory files
  const dealFiles = fs.existsSync(DEALS_DIR)
    ? fs.readdirSync(DEALS_DIR).filter(f => f.endsWith('.md')).sort().reverse()
    : [];

  const deals = dealFiles.slice(0, 100).map(file => {
    try {
      const content = fs.readFileSync(path.join(DEALS_DIR, file), 'utf-8');
      const nameMatch = content.match(/^# (.+)/m);
      const senderMatch = content.match(/\*\*Sender\*\*:\s*(.+)/);
      const sectorMatch = content.match(/\*\*Sector\*\*:\s*(.+)/);
      const verdictMatch = content.match(/\*\*Verdict\*\*:\s*(.+)/);
      const dateMatch = content.match(/\*\*Date\*\*:\s*(.+)/);
      const summaryMatch = content.match(/## Summary\n([\s\S]+)/);

      return {
        filename: file,
        companyName: nameMatch?.[1]?.trim() || file.replace('.md', ''),
        sender: senderMatch?.[1]?.trim() || 'Unknown',
        sector: sectorMatch?.[1]?.trim() || 'Unknown',
        verdict: verdictMatch?.[1]?.trim() || 'PENDING',
        date: dateMatch?.[1]?.trim() || '',
        summary: summaryMatch?.[1]?.trim() || '',
      };
    } catch {
      return null;
    }
  }).filter(Boolean);

  // Gmail config status
  const gmailConfigured = Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);

  return NextResponse.json({
    gmailConfigured,
    gmailUser: gmailConfigured ? process.env.GMAIL_USER : null,
    scans,
    deals,
    totalScans: scanFiles.length,
    totalDeals: dealFiles.length,
  });
}
