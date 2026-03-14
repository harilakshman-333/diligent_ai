/**
 * Gmail Crawl API
 * 
 * POST /api/openclaw/crawl — Trigger a manual Gmail inbox crawl
 * 
 * Connects to Gmail via IMAP, searches for unread emails with PDF attachments,
 * filters for pitch deck keywords, and analyzes each via /api/generate-memo.
 */

import { NextResponse } from 'next/server';
import { ImapFlow } from 'imapflow';
import * as fs from 'fs';
import * as path from 'path';

const DOWNLOADS_DIR = path.join(process.env.HOME || '~', '.openclaw', 'workspace', 'downloads');
const MEMORY_DIR = path.join(process.env.HOME || '~', '.openclaw', 'workspace', 'memory');
const DEALS_DIR = path.join(MEMORY_DIR, 'deals');
const SCANS_DIR = path.join(MEMORY_DIR, 'scans');

fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
fs.mkdirSync(DEALS_DIR, { recursive: true });
fs.mkdirSync(SCANS_DIR, { recursive: true });

const PITCH_KEYWORDS = [
  'pitch deck', 'pitch', 'investment opportunity', 'funding round',
  'series a', 'series b', 'series c', 'seed round', 'pre-seed',
  'fundraise', 'fundraising', 'startup', 'deck', 'investor update',
  'investment memo', 'term sheet', 'cap table',
];

interface EmailInfo {
  uid: number;
  from: string;
  subject: string;
  date: string;
  hasPdf: boolean;
  pdfFilenames: string[];
  isPitch: boolean;
}

interface ScanResult {
  id: string;
  timestamp: string;
  totalEmails: number;
  pitchDecksFound: number;
  analyzed: number;
  emails: EmailInfo[];
  analyses: Array<{
    companyName: string;
    sender: string;
    subject: string;
    verdict: string;
    sector: string;
    summary: string;
  }>;
  status: 'success' | 'error';
  error?: string;
}

function flattenBodyStructure(structure: any): any[] {
  const parts: any[] = [];
  if (!structure) return parts;
  if (structure.childNodes) {
    for (const child of structure.childNodes) {
      parts.push(...flattenBodyStructure(child));
    }
  } else {
    parts.push(structure);
  }
  return parts;
}

export async function POST() {
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;

  if (!gmailUser || !gmailPass) {
    return NextResponse.json(
      { error: 'Gmail not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD in .env.local' },
      { status: 400 }
    );
  }

  const scanId = `scan-${Date.now()}`;
  const scanResult: ScanResult = {
    id: scanId,
    timestamp: new Date().toISOString(),
    totalEmails: 0,
    pitchDecksFound: 0,
    analyzed: 0,
    emails: [],
    analyses: [],
    status: 'success',
  };

  let client: ImapFlow | null = null;

  try {
    // Connect to Gmail
    client = new ImapFlow({
      host: 'imap.gmail.com',
      port: 993,
      secure: true,
      auth: { user: gmailUser, pass: gmailPass },
      logger: false,
    });

    await client.connect();
    await client.mailboxOpen('INBOX');

    // Search unread from last 24h
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const searchResults = await client.search({ seen: false, since: yesterday });
    const uidList = Array.isArray(searchResults) ? searchResults : [];
    scanResult.totalEmails = uidList.length;

    // Process each email
    for (const uid of uidList) {
      try {
        const message = await (client as any).fetchOne(String(uid), {
          envelope: true,
          bodyStructure: true,
        });
        if (!message?.envelope) continue;

        const from = message.envelope.from?.[0]?.address || 'unknown';
        const subject = message.envelope.subject || '(no subject)';
        const date = message.envelope.date
          ? new Date(message.envelope.date).toISOString()
          : new Date().toISOString();

        // Find PDF attachments
        const parts = flattenBodyStructure(message.bodyStructure);
        const pdfParts = parts.filter((p: any) =>
          p.type === 'application/pdf' ||
          (p.disposition === 'attachment' && p.parameters?.name?.endsWith('.pdf'))
        );

        const pdfFilenames = pdfParts.map((p: any) =>
          p.dispositionParameters?.filename || p.parameters?.name || `attachment-${uid}.pdf`
        );

        const subjectLower = subject.toLowerCase();
        const hasPitchKeyword = PITCH_KEYWORDS.some(kw => subjectLower.includes(kw));
        const hasRelevantFilename = pdfFilenames.some((fn: string) => {
          const lower = fn.toLowerCase();
          return lower.includes('pitch') || lower.includes('deck') ||
            lower.includes('investor') || lower.includes('series');
        });
        const isPitch = pdfParts.length > 0 && (hasPitchKeyword || hasRelevantFilename);

        const emailInfo: EmailInfo = {
          uid,
          from,
          subject,
          date,
          hasPdf: pdfParts.length > 0,
          pdfFilenames,
          isPitch,
        };
        scanResult.emails.push(emailInfo);

        // Download and analyze pitch deck PDFs
        if (isPitch) {
          scanResult.pitchDecksFound++;
          for (const pdfPart of pdfParts) {
            const filename = pdfPart.dispositionParameters?.filename
              || pdfPart.parameters?.name
              || `attachment-${uid}.pdf`;

            if (pdfPart.size && pdfPart.size > 25 * 1024 * 1024) continue;

            try {
              const { content } = await client.download(String(uid), pdfPart.part);
              const chunks: Buffer[] = [];
              for await (const chunk of content) {
                chunks.push(Buffer.from(chunk));
              }
              const pdfBuffer = Buffer.concat(chunks);

              // Save PDF
              const filePath = path.join(DOWNLOADS_DIR, `${Date.now()}-${filename}`);
              fs.writeFileSync(filePath, pdfBuffer);

              // Analyze via API
              const DILIGENT_API_URL = process.env.DILIGENT_API_URL || 'http://localhost:3001';
              const formData = new FormData();
              formData.append('pitchDeck', new Blob([new Uint8Array(pdfBuffer)], { type: 'application/pdf' }), filename);
              formData.append('mode', 'pitch-only');

              const response = await fetch(`${DILIGENT_API_URL}/api/generate-memo`, {
                method: 'POST',
                body: formData,
              });

              if (response.ok) {
                const result = await response.json();
                const { pitchData, dealLog, memo } = result;

                const riskMatch = memo?.match(/(?:risk|red flag|concern)[:\s]*([^\n]+)/i);
                const summaryMatch = memo?.match(/(?:what they do|overview|summary)[:\s]*\n?([^\n]+)/i);

                const analysis = {
                  companyName: pitchData?.companyName || filename.replace('.pdf', ''),
                  sender: from,
                  subject,
                  verdict: dealLog?.verdict || 'PENDING',
                  sector: pitchData?.sector || 'Unknown',
                  summary: summaryMatch?.[1]?.trim() || pitchData?.companyDescription?.slice(0, 150) || 'Analysis complete',
                };
                scanResult.analyses.push(analysis);
                scanResult.analyzed++;

                // Save deal to memory
                const safeCompany = analysis.companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                const dealFile = path.join(DEALS_DIR, `${new Date().toISOString().split('T')[0]}-${safeCompany}.md`);
                if (!fs.existsSync(dealFile)) {
                  fs.writeFileSync(dealFile, `# ${analysis.companyName}\n\n- **Date**: ${new Date().toISOString().split('T')[0]}\n- **Sender**: ${analysis.sender}\n- **Subject**: ${analysis.subject}\n- **Sector**: ${analysis.sector}\n- **Verdict**: ${analysis.verdict}\n\n## Summary\n${analysis.summary}\n`);
                }

                // Mark as read
                await (client as any).messageFlagsAdd(String(uid), ['\\Seen']);
              }
            } catch (dlErr: any) {
              console.error(`Failed to analyze ${filename}: ${dlErr.message}`);
            }
          }
        }
      } catch (emailErr: any) {
        console.error(`Failed to process email ${uid}: ${emailErr.message}`);
      }
    }

    // Save scan result
    const scanFile = path.join(SCANS_DIR, `${scanId}.json`);
    fs.writeFileSync(scanFile, JSON.stringify(scanResult, null, 2));

    await client.logout();

    return NextResponse.json(scanResult);

  } catch (error: any) {
    scanResult.status = 'error';
    scanResult.error = error.message;

    // Save failed scan
    const scanFile = path.join(SCANS_DIR, `${scanId}.json`);
    fs.writeFileSync(scanFile, JSON.stringify(scanResult, null, 2));

    if (client) {
      try { await client.logout(); } catch {}
    }

    return NextResponse.json(scanResult, { status: 500 });
  }
}
