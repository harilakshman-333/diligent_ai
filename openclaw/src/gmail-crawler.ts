/**
 * OpenClaw Gmail Inbox Crawler
 * 
 * Connects via IMAP to a Gmail account, searches for unread emails
 * with pitch deck PDFs, downloads them, and runs analysis.
 * 
 * Uses Google App Password for authentication (no OAuth required).
 * 
 * Setup:
 *   1. Enable 2FA on the Gmail account
 *   2. Generate an App Password: https://myaccount.google.com/apppasswords
 *   3. Set GMAIL_USER and GMAIL_APP_PASSWORD in .env.local
 */

import { ImapFlow } from 'imapflow';
import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';

const DILIGENT_API_URL = process.env.DILIGENT_API_URL || 'http://localhost:3001';
const DOWNLOADS_DIR = path.join(process.env.HOME || '~', '.openclaw', 'workspace', 'downloads');
const MEMORY_DIR = path.join(process.env.HOME || '~', '.openclaw', 'workspace', 'memory');
const DEALS_DIR = path.join(MEMORY_DIR, 'deals');

// Ensure directories exist
fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
fs.mkdirSync(DEALS_DIR, { recursive: true });

// Pitch deck detection keywords (subject line / sender)
const PITCH_KEYWORDS = [
  'pitch deck', 'pitch', 'investment opportunity', 'funding round',
  'series a', 'series b', 'series c', 'seed round', 'pre-seed',
  'fundraise', 'fundraising', 'startup', 'deck', 'investor update',
  'investment memo', 'term sheet', 'cap table',
];

interface EmailResult {
  uid: number;
  from: string;
  subject: string;
  date: Date;
  pdfAttachments: Array<{
    filename: string;
    content: Buffer;
  }>;
}

interface AnalysisResult {
  companyName: string;
  sender: string;
  subject: string;
  verdict: string;
  sector: string;
  keyRisk: string;
  summary: string;
}

export class GmailCrawler extends EventEmitter {
  private client: ImapFlow | null = null;
  private gmailUser: string;
  private gmailPassword: string;

  constructor() {
    super();
    this.gmailUser = process.env.GMAIL_USER || '';
    this.gmailPassword = process.env.GMAIL_APP_PASSWORD || '';
  }

  /** Check if Gmail credentials are configured */
  isConfigured(): boolean {
    return Boolean(this.gmailUser && this.gmailPassword);
  }

  /** Connect to Gmail IMAP */
  async connect(): Promise<boolean> {
    if (!this.isConfigured()) {
      console.error('❌ Gmail not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD in .env.local');
      return false;
    }

    try {
      this.client = new ImapFlow({
        host: 'imap.gmail.com',
        port: 993,
        secure: true,
        auth: {
          user: this.gmailUser,
          pass: this.gmailPassword,
        },
        logger: false,
      });

      await this.client.connect();
      console.log(`✅ Connected to Gmail: ${this.gmailUser}`);
      return true;
    } catch (error: any) {
      console.error(`❌ Gmail connection failed: ${error.message}`);
      return false;
    }
  }

  /** Disconnect from Gmail */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.logout();
      this.client = null;
    }
  }

  /**
   * Crawl inbox for unread pitch deck emails from the last 24 hours.
   * Returns analyzed deals ready for briefing compilation.
   */
  async crawlInbox(): Promise<{
    totalEmails: number;
    pitchDecksFound: number;
    analyses: AnalysisResult[];
  }> {
    if (!this.client) {
      const connected = await this.connect();
      if (!connected) return { totalEmails: 0, pitchDecksFound: 0, analyses: [] };
    }

    console.log('\n📬 Crawling Gmail inbox...');
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    try {
      // Open INBOX
      await this.client!.mailboxOpen('INBOX');

      // Search for unread messages from last 24 hours
      const searchResults = await this.client!.search({
        seen: false,
        since: yesterday,
      });

      const uids = searchResults || [];
      const uidList = Array.isArray(uids) ? uids : [];
      console.log(`📧 Found ${uidList.length} unread emails from last 24h`);

      const pitchEmails: EmailResult[] = [];
      let totalEmails = uidList.length;

      // Process each email
      for (const uid of uidList) {
        const email = await this.extractEmail(uid);
        if (!email) continue;

        // Check if it looks like a pitch deck email
        if (this.isPitchDeckEmail(email)) {
          pitchEmails.push(email);
        }
      }

      console.log(`📄 ${pitchEmails.length} emails contain pitch deck PDFs`);

      // Analyze each pitch deck
      const analyses: AnalysisResult[] = [];
      for (const email of pitchEmails) {
        for (const pdf of email.pdfAttachments) {
          console.log(`🔍 Analyzing: ${pdf.filename} (from ${email.from})`);
          
          const analysis = await this.analyzePitchDeck(pdf, email);
          if (analysis) {
            analyses.push(analysis);
            
            // Save to persistent memory
            this.saveDealToMemory(analysis);

            // Mark email as read
            await this.markAsRead(email.uid);

            this.emit('deck-analyzed', analysis);
          }
        }
      }

      return {
        totalEmails,
        pitchDecksFound: pitchEmails.length,
        analyses,
      };

    } catch (error: any) {
      console.error(`❌ Inbox crawl failed: ${error.message}`);
      return { totalEmails: 0, pitchDecksFound: 0, analyses: [] };
    }
  }

  /** Extract email metadata and PDF attachments */
  private async extractEmail(uid: number): Promise<EmailResult | null> {
    try {
      const message = await this.client!.fetchOne(String(uid), {
        envelope: true,
        bodyStructure: true,
      }) as any;

      if (!message || !message.envelope) return null;

      const from = message.envelope.from?.[0]?.address || 'unknown';
      const subject = message.envelope.subject || '';
      const date = message.envelope.date || new Date();

      // Find PDF attachments
      const pdfAttachments: Array<{ filename: string; content: Buffer }> = [];
      const parts = this.flattenBodyStructure(message.bodyStructure);

      for (const part of parts) {
        if (
          part.type === 'application/pdf' ||
          (part.disposition === 'attachment' && part.parameters?.name?.endsWith('.pdf'))
        ) {
          const filename = part.dispositionParameters?.filename 
            || part.parameters?.name 
            || `attachment-${uid}.pdf`;

          // Skip oversized PDFs (>25MB)
          if (part.size && part.size > 25 * 1024 * 1024) {
            console.log(`⚠️  Skipping oversized PDF: ${filename} (${Math.round(part.size / 1024 / 1024)}MB)`);
            continue;
          }

          try {
            const { content } = await this.client!.download(String(uid), part.part);
            const chunks: Buffer[] = [];
            for await (const chunk of content) {
              chunks.push(Buffer.from(chunk));
            }
            pdfAttachments.push({
              filename,
              content: Buffer.concat(chunks),
            });
          } catch (dlError: any) {
            console.error(`⚠️  Failed to download ${filename}: ${dlError.message}`);
          }
        }
      }

      return { uid, from, subject, date, pdfAttachments };
    } catch (error: any) {
      console.error(`⚠️  Failed to read email ${uid}: ${error.message}`);
      return null;
    }
  }

  /** Flatten BODYSTRUCTURE to get all parts */
  private flattenBodyStructure(structure: any): any[] {
    const parts: any[] = [];
    if (!structure) return parts;

    if (structure.childNodes) {
      for (const child of structure.childNodes) {
        parts.push(...this.flattenBodyStructure(child));
      }
    } else {
      parts.push(structure);
    }
    return parts;
  }

  /** Check if an email is likely a pitch deck submission */
  private isPitchDeckEmail(email: EmailResult): boolean {
    // Must have at least one PDF attachment
    if (email.pdfAttachments.length === 0) return false;

    // Check subject line for keywords
    const subjectLower = email.subject.toLowerCase();
    const hasPitchKeyword = PITCH_KEYWORDS.some(kw => subjectLower.includes(kw));
    
    // Also check PDF filename
    const hasRelevantFilename = email.pdfAttachments.some(pdf => {
      const nameLower = pdf.filename.toLowerCase();
      return nameLower.includes('pitch') || nameLower.includes('deck') 
        || nameLower.includes('investor') || nameLower.includes('series');
    });

    // If subject has keyword OR filename looks relevant, it's a pitch
    // Also accept any email with a PDF if subject mentions a company/startup
    return hasPitchKeyword || hasRelevantFilename || email.pdfAttachments.length > 0;
  }

  /** Send a PDF to Diligent-AI for analysis */
  private async analyzePitchDeck(
    pdf: { filename: string; content: Buffer },
    email: EmailResult
  ): Promise<AnalysisResult | null> {
    try {
      // Save PDF locally
      const filePath = path.join(DOWNLOADS_DIR, `${Date.now()}-${pdf.filename}`);
      fs.writeFileSync(filePath, pdf.content);

      // Send to API
      const formData = new FormData();
      const uint8 = new Uint8Array(pdf.content);
      formData.append('pitchDeck', new Blob([uint8], { type: 'application/pdf' }), pdf.filename);
      formData.append('mode', 'pitch-only');

      const response = await fetch(`${DILIGENT_API_URL}/api/generate-memo`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const result = await response.json();
      const { pitchData, dealLog, memo } = result;

      // Extract key risk from memo (first "Risk" or "Red Flag" bullet)
      const riskMatch = memo?.match(/(?:risk|red flag|concern)[:\s]*([^\n]+)/i);
      const keyRisk = riskMatch?.[1]?.trim() || 'See full memo';

      // Extract a 1-line summary
      const summaryMatch = memo?.match(/(?:what they do|overview|summary)[:\s]*\n?([^\n]+)/i);
      const summary = summaryMatch?.[1]?.trim() 
        || pitchData?.companyDescription?.slice(0, 150) 
        || 'Analysis complete';

      return {
        companyName: pitchData?.companyName || pdf.filename.replace('.pdf', ''),
        sender: email.from,
        subject: email.subject,
        verdict: dealLog?.verdict || 'PENDING',
        sector: pitchData?.sector || 'Unknown',
        keyRisk,
        summary,
      };
    } catch (error: any) {
      console.error(`❌ Analysis failed for ${pdf.filename}: ${error.message}`);
      return null;
    }
  }

  /** Mark an email as read */
  private async markAsRead(uid: number): Promise<void> {
    try {
      await this.client!.messageFlagsAdd(String(uid), ['\\Seen']);
    } catch (error: any) {
      console.error(`⚠️  Failed to mark email ${uid} as read: ${error.message}`);
    }
  }

  /** Save deal analysis to persistent memory */
  private saveDealToMemory(analysis: AnalysisResult): void {
    const date = new Date().toISOString().split('T')[0];
    const safeCompany = analysis.companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const filename = `${date}-${safeCompany}.md`;
    const filepath = path.join(DEALS_DIR, filename);

    // Skip if already analyzed today
    if (fs.existsSync(filepath)) {
      console.log(`⏭️  Already analyzed ${analysis.companyName} today`);
      return;
    }

    const content = `# ${analysis.companyName}

- **Date**: ${date}
- **Sender**: ${analysis.sender}
- **Subject**: ${analysis.subject}
- **Sector**: ${analysis.sector}
- **Verdict**: ${analysis.verdict}
- **Key Risk**: ${analysis.keyRisk}

## Summary
${analysis.summary}
`;

    fs.writeFileSync(filepath, content);
    console.log(`💾 Deal saved: ${filename}`);
  }

  /**
   * Compile analyzed deals into a morning briefing via the /api/briefing endpoint.
   */
  async compileBriefing(analyses: AnalysisResult[], totalEmails: number, pitchDecksFound: number): Promise<string | null> {
    if (analyses.length === 0) {
      return '☀️ *Morning Deal Flow Briefing*\n\nNo new pitch decks in your inbox today.\nEnjoy your coffee! ☕';
    }

    try {
      const response = await fetch(`${DILIGENT_API_URL}/api/briefing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deals: analyses,
          totalEmails,
          pitchDecksFound,
          date: new Date().toISOString().split('T')[0],
        }),
      });

      if (!response.ok) {
        throw new Error(`Briefing API returned ${response.status}`);
      }

      const result = await response.json();
      return result.briefing;
    } catch (error: any) {
      console.error(`❌ Briefing compilation failed: ${error.message}`);
      return null;
    }
  }

  /** Log briefing execution to memory */
  logBriefingRun(dealCount: number): void {
    const now = new Date();
    const content = `# Last Briefing Run

- **Date**: ${now.toISOString().split('T')[0]}
- **Time**: ${now.toTimeString().split(' ')[0]}
- **Deals Analyzed**: ${dealCount}
`;

    const filepath = path.join(MEMORY_DIR, 'last-briefing-run.md');
    fs.writeFileSync(filepath, content);
  }
}

export default GmailCrawler;
