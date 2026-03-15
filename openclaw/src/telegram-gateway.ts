/**
 * OpenClaw Telegram Gateway
 * 
 * Connects to Telegram via the Bot API (BotFather token).
 * No extra infra required — just create a bot with @BotFather.
 * 
 * Handles:
 *   - Incoming PDF attachments → analyze via /api/generate-memo
 *   - Text commands ("analyze", "check inbox", etc.)
 *   - Outbound briefing delivery
 * 
 * Setup:
 *   1. Message @BotFather on Telegram → /newbot
 *   2. Copy the token into TELEGRAM_BOT_TOKEN in .env.local
 *   3. Message your bot once, then set TELEGRAM_CHAT_ID (or it auto-detects)
 */

import TelegramBot from 'node-telegram-bot-api';
import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';

const DILIGENT_API_URL = process.env.DILIGENT_API_URL || 'http://localhost:3001';
const DOWNLOADS_DIR = path.join(process.env.HOME || '~', '.openclaw', 'workspace', 'downloads');

// Ensure directories exist
fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });

export class TelegramGateway extends EventEmitter {
  private bot: TelegramBot | null = null;
  private connected = false;
  private vcChatId: string | null = null;
  private token: string;

  constructor() {
    super();
    this.token = process.env.TELEGRAM_BOT_TOKEN || '';
    this.vcChatId = process.env.TELEGRAM_CHAT_ID || null;
  }

  async start(): Promise<void> {
    if (!this.token) {
      console.log('⚠️  TELEGRAM_BOT_TOKEN not set — Telegram gateway disabled');
      console.log('   Create a bot via @BotFather and add the token to .env.local');
      return;
    }

    console.log('\n🔗 OpenClaw Telegram Gateway starting...');
    console.log(`📡 API target: ${DILIGENT_API_URL}`);

    this.bot = new TelegramBot(this.token, { polling: true });

    // Connection confirmation
    try {
      const me = await this.bot.getMe();
      this.connected = true;
      console.log(`\n✅ Telegram Gateway connected as @${me.username}`);
      console.log('🎯 Listening for incoming pitch decks...\n');
      this.emit('connected');
    } catch (error: any) {
      console.error('❌ Telegram bot authentication failed:', error.message);
      this.connected = false;
      return;
    }

    // Handle incoming messages
    this.bot.on('message', async (msg) => {
      try {
        await this.handleMessage(msg);
      } catch (error: any) {
        console.error('❌ Error handling message:', error.message);
      }
    });

    // Handle polling errors gracefully
    this.bot.on('polling_error', (error: any) => {
      if (error.code === 'ETELEGRAM' && error.response?.statusCode === 409) {
        console.warn('⚠️  Another bot instance is running — stopping duplicate polling');
        this.stop();
      } else {
        console.error('⚠️  Telegram polling error:', error.message);
      }
    });
  }

  private async handleMessage(msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id.toString();

    // Auto-detect chat ID for briefing delivery
    if (!this.vcChatId) {
      this.vcChatId = chatId;
      console.log(`📱 VC chat ID detected: ${chatId}`);
    }

    // Check for PDF document
    if (msg.document && msg.document.mime_type === 'application/pdf') {
      await this.handlePitchDeck(msg, chatId);
      return;
    }

    // Check for text commands
    const text = msg.text?.toLowerCase().trim() || '';
    if (text) {
      await this.handleTextCommand(text, chatId);
    }
  }

  private async handlePitchDeck(msg: TelegramBot.Message, chatId: string): Promise<void> {
    if (!this.bot || !msg.document) return;

    const fileName = msg.document.file_name || `pitch-${Date.now()}.pdf`;
    console.log(`📄 PDF received: ${fileName}`);

    await this.bot.sendMessage(chatId, '🔍 *Analyzing pitch deck...* Give me 30 seconds.', {
      parse_mode: 'Markdown',
    });

    try {
      // Download the file from Telegram servers
      const fileLink = await this.bot.getFileLink(msg.document.file_id);
      const response = await fetch(fileLink);
      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.status}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Save locally
      const filePath = path.join(DOWNLOADS_DIR, `${Date.now()}-${fileName}`);
      fs.writeFileSync(filePath, buffer);
      console.log(`💾 Saved: ${filePath}`);

      // Send to Diligent-AI API
      const formData = new FormData();
      const uint8 = new Uint8Array(buffer);
      formData.append('pitchDeck', new Blob([uint8], { type: 'application/pdf' }), fileName);
      formData.append('mode', 'pitch-only');

      const apiResponse = await fetch(`${DILIGENT_API_URL}/api/generate-memo`, {
        method: 'POST',
        body: formData,
      });

      if (!apiResponse.ok) {
        throw new Error(`API returned ${apiResponse.status}: ${await apiResponse.text()}`);
      }

      const result = await apiResponse.json();

      // Format for Telegram (supports Markdown)
      const telegramMemo = this.formatMemoForTelegram(result);

      // Telegram has a 4096 char limit per message — split if needed
      await this.sendLongMessage(chatId, telegramMemo);

      console.log(`✅ Analysis sent for: ${result.pitchData?.companyName || fileName}`);
      this.emit('analysis-complete', {
        company: result.pitchData?.companyName,
        verdict: result.dealLog?.verdict,
        sender: chatId,
      });

    } catch (error: any) {
      console.error('❌ Analysis failed:', error.message);
      await this.bot.sendMessage(chatId, `❌ Analysis failed: ${error.message}\n\nPlease try again or check the dashboard.`);
    }
  }

  private async handleTextCommand(text: string, chatId: string): Promise<void> {
    if (!this.bot) return;

    // Deal chat follow-up keywords
    const chatKeywords = ['tell me more', 'what are the risks', 'how does pricing',
      'compare to competitors', 'burn rate', 'revenue model', 'team background',
      'what about', 'explain the'];

    if (chatKeywords.some(kw => text.includes(kw))) {
      await this.bot.sendMessage(chatId,
        '💬 Use the web dashboard for follow-up questions:\n' +
        `${DILIGENT_API_URL}\n\nThe chatbot has full context from your analysis.`
      );
      return;
    }

    // Manual inbox check trigger
    if (text.includes('check inbox') || text.includes('check email') || text.includes('morning briefing') || text === '/briefing') {
      this.emit('trigger-briefing', chatId);
      await this.bot.sendMessage(chatId, '📬 Checking your inbox now... I\'ll send the briefing shortly.');
      return;
    }

    // Help / start command
    if (text === 'help' || text === 'hi' || text === 'hello' || text === '/start' || text === '/help') {
      await this.bot.sendMessage(chatId,
        '🤖 *Diligent-AI — VC Due Diligence Bot*\n\n' +
        '📄 *Send a PDF* — I\'ll analyze any pitch deck in ~30 seconds\n' +
        '📬 *"Check inbox"* or /briefing — Trigger a manual Gmail inbox scan\n' +
        '🌅 *Auto briefing* — Every morning at 7:00 AM\n' +
        '💻 *Dashboard* — ' + DILIGENT_API_URL + '\n\n' +
        '_Powered by Claude AI + Yahoo Finance + Alpha Vantage_',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // Default
    await this.bot.sendMessage(chatId,
      '📄 Send me a pitch deck PDF and I\'ll analyze it!\n' +
      'Or type /help for all commands.'
    );
  }

  private formatMemoForTelegram(result: any): string {
    const { memo, pitchData, dealLog } = result;

    const company = pitchData?.companyName || 'Unknown Company';
    const sector = pitchData?.sector || 'Unknown';
    const verdict = dealLog?.verdict || 'PENDING';

    const verdictMap: Record<string, string> = {
      'STRONG BUY': '🟢🟢',
      'BUY': '🟢',
      'HOLD': '🟡',
      'PASS': '🔴',
    };
    const verdictEmoji = verdictMap[verdict] || '⚪';

    // Telegram supports Markdown — keep most formatting
    let telegramMemo = memo || '';

    // Clean up markdown tables (Telegram doesn't render them)
    telegramMemo = telegramMemo.replace(/\|[^\n]*\|/g, '');
    telegramMemo = telegramMemo.replace(/\n{3,}/g, '\n\n');

    return `${verdictEmoji} *DILIGENT-AI ANALYSIS*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `🏢 *${company}*  |  ${sector}\n` +
      `📊 Verdict: *${verdict}*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      telegramMemo +
      `\n\n💻 Full memo: ${DILIGENT_API_URL}`;
  }

  /** Split long messages to fit Telegram's 4096-char limit */
  private async sendLongMessage(chatId: string, text: string): Promise<void> {
    if (!this.bot) return;

    const MAX_LEN = 4000; // leave buffer
    if (text.length <= MAX_LEN) {
      await this.bot.sendMessage(chatId, text, { parse_mode: 'Markdown' }).catch(() => {
        // Fallback: send without parse_mode if Markdown fails
        return this.bot!.sendMessage(chatId, text);
      });
      return;
    }

    // Split on double newlines to keep paragraphs intact
    const chunks: string[] = [];
    let current = '';
    for (const line of text.split('\n')) {
      if ((current + '\n' + line).length > MAX_LEN) {
        chunks.push(current);
        current = line;
      } else {
        current = current ? current + '\n' + line : line;
      }
    }
    if (current) chunks.push(current);

    for (const chunk of chunks) {
      await this.bot.sendMessage(chatId, chunk, { parse_mode: 'Markdown' }).catch(() => {
        return this.bot!.sendMessage(chatId, chunk);
      });
    }
  }

  /** Send a briefing message to the VC */
  async sendBriefing(briefingText: string, targetChatId?: string): Promise<boolean> {
    const chatId = targetChatId || this.vcChatId;
    if (!this.bot || !this.connected || !chatId) {
      console.error('❌ Cannot send briefing: not connected or no chat ID');
      return false;
    }

    try {
      await this.sendLongMessage(chatId, briefingText);
      console.log('📤 Briefing delivered via Telegram');
      return true;
    } catch (error: any) {
      console.error('❌ Briefing delivery failed:', error.message);
      return false;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  stop(): void {
    if (this.bot) {
      this.bot.stopPolling();
      this.connected = false;
      console.log('🛑 Telegram Gateway stopped');
    }
  }

  getChatId(): string | null {
    return this.vcChatId;
  }
}

export default TelegramGateway;
