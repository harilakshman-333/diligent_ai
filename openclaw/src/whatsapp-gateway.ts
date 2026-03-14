/**
 * OpenClaw WhatsApp Gateway
 * 
 * Connects as a WhatsApp Linked Device using Baileys (WebSocket protocol).
 * No Meta Business API required — just scan the QR code.
 * 
 * Handles:
 *   - Incoming PDF attachments → analyze via /api/generate-memo
 *   - Text commands ("analyze", "check inbox", etc.)
 *   - Outbound briefing delivery
 */

import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  downloadMediaMessage,
  WAMessage,
  proto,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';
// @ts-ignore — no type declarations available
import QRCode from 'qrcode-terminal';

const DILIGENT_API_URL = process.env.DILIGENT_API_URL || 'http://localhost:3001';
const AUTH_DIR = path.join(process.env.HOME || '~', '.openclaw', 'auth', 'whatsapp');
const DOWNLOADS_DIR = path.join(process.env.HOME || '~', '.openclaw', 'workspace', 'downloads');

// Ensure directories exist
fs.mkdirSync(AUTH_DIR, { recursive: true });
fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });

export class WhatsAppGateway extends EventEmitter {
  private sock: ReturnType<typeof makeWASocket> | null = null;
  private connected = false;
  private qrCode: string | null = null;
  private vcNumber: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnects = 5;

  async start(): Promise<void> {
    console.log('\n🔗 OpenClaw WhatsApp Gateway starting...');
    console.log(`📡 API target: ${DILIGENT_API_URL}`);
    
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

    this.sock = makeWASocket({
      auth: state,
      browser: ['Diligent-AI', 'Chrome', '120.0.0'],
      // Enable logging to debug connection
      logger: {
        level: 'warn',
        child: () => ({ level: 'warn', child: () => ({} as any), trace: () => {}, debug: () => {}, info: () => {}, warn: console.warn, error: console.error, fatal: console.error }) as any,
        trace: () => {},
        debug: () => {},
        info: () => {},
        warn: console.warn,
        error: console.error,
        fatal: console.error,
      } as any,
    });

    // Connection updates
    this.sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        this.qrCode = qr;
        console.log('\n📱 Scan this QR code with WhatsApp on the VC\'s phone:');
        console.log('   WhatsApp → Settings → Linked Devices → Link a Device\n');
        QRCode.generate(qr, { small: true });
        this.emit('qr', qr);
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        
        this.connected = false;
        this.reconnectAttempts++;
        
        if (shouldReconnect && this.reconnectAttempts <= this.maxReconnects) {
          const delay = Math.min(3000 * this.reconnectAttempts, 30000);
          console.log(`⚠️  Connection closed (code: ${statusCode}). Reconnecting in ${delay/1000}s... (${this.reconnectAttempts}/${this.maxReconnects})`);
          setTimeout(() => this.start(), delay);
        } else if (this.reconnectAttempts > this.maxReconnects) {
          console.log(`⚠️  WhatsApp reconnect limit reached (${this.maxReconnects}). Run 'npm run openclaw' again to retry.`);
          this.emit('give-up');
        } else {
          console.log('⚠️  WhatsApp logged out. Scan QR code again to re-link.');
          this.emit('logout');
        }
      }

      if (connection === 'open') {
        this.connected = true;
        this.qrCode = null;
        this.reconnectAttempts = 0;
        console.log('\n✅ WhatsApp Gateway connected successfully!');
        console.log('🎯 Listening for incoming pitch decks...\n');
        this.emit('connected');
      }
    });

    // Save credentials on update
    this.sock.ev.on('creds.update', saveCreds);

    // Handle incoming messages
    this.sock.ev.on('messages.upsert', async ({ messages }) => {
      for (const msg of messages) {
        if (msg.key.fromMe) continue; // Skip our own messages
        await this.handleMessage(msg);
      }
    });
  }

  private async handleMessage(msg: WAMessage): Promise<void> {
    const jid = msg.key.remoteJid;
    if (!jid) return;

    // Store VC number for briefing delivery
    this.vcNumber = jid;

    const messageContent = msg.message;
    if (!messageContent) return;

    const sender = jid.replace('@s.whatsapp.net', '');
    console.log(`📨 Message from ${sender}`);

    // Check for PDF attachment
    const documentMessage = messageContent.documentMessage;
    const documentWithCaption = messageContent.documentWithCaptionMessage?.message?.documentMessage;
    const doc = documentMessage || documentWithCaption;

    if (doc && doc.mimetype === 'application/pdf') {
      await this.handlePitchDeck(msg, doc, jid);
      return;
    }

    // Check for text commands
    const text = messageContent.conversation 
      || messageContent.extendedTextMessage?.text 
      || '';

    if (text) {
      await this.handleTextCommand(text.toLowerCase().trim(), jid, msg);
    }
  }

  private async handlePitchDeck(
    msg: WAMessage,
    doc: proto.Message.IDocumentMessage,
    jid: string
  ): Promise<void> {
    const fileName = doc.fileName || `pitch-${Date.now()}.pdf`;
    console.log(`📄 PDF received: ${fileName}`);

    await this.sendReply(jid, '🔍 *Analyzing pitch deck...* Give me 30 seconds.');

    try {
      // Download the PDF
      const buffer = await downloadMediaMessage(
        msg,
        'buffer',
        {}
      ) as Buffer;

      // Save locally
      const filePath = path.join(DOWNLOADS_DIR, `${Date.now()}-${fileName}`);
      fs.writeFileSync(filePath, buffer);
      console.log(`💾 Saved: ${filePath}`);

      // Send to Diligent-AI API
      const formData = new FormData();
      const uint8 = new Uint8Array(buffer);
      formData.append('pitchDeck', new Blob([uint8], { type: 'application/pdf' }), fileName);
      formData.append('mode', 'pitch-only');

      const response = await fetch(`${DILIGENT_API_URL}/api/generate-memo`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${await response.text()}`);
      }

      const result = await response.json();

      // Format for WhatsApp (plain text, no markdown tables)
      const whatsappMemo = this.formatMemoForWhatsApp(result);
      await this.sendReply(jid, whatsappMemo);

      console.log(`✅ Analysis sent for: ${result.pitchData?.companyName || fileName}`);
      this.emit('analysis-complete', {
        company: result.pitchData?.companyName,
        verdict: result.dealLog?.verdict,
        sender: jid,
      });

    } catch (error: any) {
      console.error('❌ Analysis failed:', error.message);
      await this.sendReply(jid, `❌ Analysis failed: ${error.message}\n\nPlease try again or check the dashboard.`);
    }
  }

  private async handleTextCommand(text: string, jid: string, msg: WAMessage): Promise<void> {
    // Deal chat follow-up keywords
    const chatKeywords = ['tell me more', 'what are the risks', 'how does pricing', 
      'compare to competitors', 'burn rate', 'revenue model', 'team background',
      'what about', 'explain the'];
    
    if (chatKeywords.some(kw => text.includes(kw))) {
      await this.sendReply(jid, '💬 Use the web dashboard for follow-up questions:\n' +
        `${DILIGENT_API_URL}\n\nThe chatbot has full context from your analysis.`);
      return;
    }

    // Manual inbox check trigger
    if (text.includes('check inbox') || text.includes('check email') || text.includes('morning briefing')) {
      this.emit('trigger-briefing', jid);
      await this.sendReply(jid, '📬 Checking your inbox now... I\'ll send the briefing shortly.');
      return;
    }

    // Help command
    if (text === 'help' || text === 'hi' || text === 'hello') {
      await this.sendReply(jid, 
        '🤖 *Diligent-AI — VC Due Diligence Bot*\n\n' +
        '📄 *Send a PDF* — I\'ll analyze any pitch deck in ~30 seconds\n' +
        '📬 *"Check inbox"* — Trigger a manual Gmail inbox scan\n' +
        '🌅 *Auto briefing* — Every morning at 7:00 AM\n' +
        '💻 *Dashboard* — ' + DILIGENT_API_URL + '\n\n' +
        '_Powered by Claude AI + Yahoo Finance + Alpha Vantage_'
      );
      return;
    }

    // Default
    await this.sendReply(jid, 
      '📄 Send me a pitch deck PDF and I\'ll analyze it!\n' +
      'Or type *help* for all commands.'
    );
  }

  private formatMemoForWhatsApp(result: any): string {
    const { memo, pitchData, dealLog } = result;
    
    // Extract key sections from the markdown memo
    const company = pitchData?.companyName || 'Unknown Company';
    const sector = pitchData?.sector || 'Unknown';
    const verdict = dealLog?.verdict || 'PENDING';

    // Verdict emoji
    const verdictMap: Record<string, string> = {
      'STRONG BUY': '🟢🟢',
      'BUY': '🟢',
      'HOLD': '🟡',
      'PASS': '🔴',
    };
    const verdictEmoji = verdictMap[verdict] || '⚪';

    // Convert markdown to WhatsApp-friendly format
    let whatsappText = memo || '';
    
    // Replace markdown headers with WhatsApp bold
    whatsappText = whatsappText.replace(/^### (.*?)$/gm, '\n*$1*');
    whatsappText = whatsappText.replace(/^## (.*?)$/gm, '\n*$1*');
    whatsappText = whatsappText.replace(/^# (.*?)$/gm, '\n*$1*');
    
    // Replace markdown bold/italic
    whatsappText = whatsappText.replace(/\*\*(.*?)\*\*/g, '*$1*');
    
    // Remove markdown tables (replace with bullet points)
    whatsappText = whatsappText.replace(/\|[^\n]*\|/g, '');
    whatsappText = whatsappText.replace(/\n{3,}/g, '\n\n');

    // Truncate for WhatsApp (max ~4000 chars)
    if (whatsappText.length > 3800) {
      whatsappText = whatsappText.slice(0, 3800) + '\n\n_...Full memo on dashboard_';
    }

    return `${verdictEmoji} *DILIGENT-AI ANALYSIS*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `🏢 *${company}*  |  ${sector}\n` +
      `📊 Verdict: *${verdict}*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      whatsappText +
      `\n\n💻 Full memo: ${DILIGENT_API_URL}`;
  }

  /** Send a briefing message to the VC */
  async sendBriefing(briefingText: string, targetJid?: string): Promise<boolean> {
    const jid = targetJid || this.vcNumber;
    if (!this.sock || !this.connected || !jid) {
      console.error('❌ Cannot send briefing: not connected or no VC number');
      return false;
    }

    try {
      await this.sendReply(jid, briefingText);
      console.log('📤 Briefing delivered via WhatsApp');
      return true;
    } catch (error: any) {
      console.error('❌ Briefing delivery failed:', error.message);
      return false;
    }
  }

  private async sendReply(jid: string, text: string): Promise<void> {
    if (!this.sock) return;
    await this.sock.sendMessage(jid, { text });
  }

  isConnected(): boolean {
    return this.connected;
  }

  getQRCode(): string | null {
    return this.qrCode;
  }

  getVCNumber(): string | null {
    return this.vcNumber;
  }
}

export default WhatsAppGateway;
