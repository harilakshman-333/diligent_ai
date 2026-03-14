/**
 * OpenClaw WhatsApp HTTP Bridge
 *
 * Starts the WhatsApp gateway (Baileys) and exposes a tiny HTTP server
 * so any local app can send a WhatsApp message by POSTing JSON.
 *
 * POST http://localhost:3099/send
 * {
 *   "to": "+441234567890",
 *   "message": "Hello from PropHunt AI!"
 * }
 *
 * Usage:
 *   npx tsx openclaw/src/send-server.ts
 */

import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { WhatsAppGateway } from './whatsapp-gateway.js';

// Load .env.local from the project root
const envPath = path.resolve(__dirname, '../../.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const PORT = parseInt(process.env.WA_BRIDGE_PORT || '3099', 10);

const gateway = new WhatsAppGateway();
let ready = false;

gateway.on('connected', () => {
  ready = true;
  console.log(`✅ WhatsApp connected — HTTP bridge ready at http://localhost:${PORT}/send`);
});

gateway.on('qr', () => {
  console.log('📱 Scan the QR code above in WhatsApp → Linked Devices → Link a Device');
});

gateway.on('give-up', () => {
  console.error('❌ WhatsApp gave up connecting. Restart and rescan the QR code.');
});

// ── HTTP Server ─────────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  const setCors = () => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  };

  if (req.method === 'OPTIONS') {
    setCors();
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'GET' && req.url === '/health') {
    setCors();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, whatsapp: ready ? 'connected' : 'waiting' }));
    return;
  }

  if (req.method === 'POST' && req.url === '/send') {
    setCors();
    try {
      const body = await new Promise<string>((resolve, reject) => {
        let data = '';
        req.on('data', chunk => data += chunk);
        req.on('end', () => resolve(data));
        req.on('error', reject);
      });

      const { to, message } = JSON.parse(body) as { to: string; message: string };

      if (!to || !message) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'Missing fields: to, message' }));
        return;
      }

      if (!ready) {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'WhatsApp not connected yet. Scan QR.' }));
        return;
      }

      // Normalise number → WhatsApp JID  e.g. "+44..." → "44...@s.whatsapp.net"
      const digits = to.replace(/\D/g, '');
      const jid = `${digits}@s.whatsapp.net`;

      await gateway.sendBriefing(message, jid);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, to: jid }));
    } catch (err: any) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: err.message }));
    }
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ ok: false, error: 'Not found' }));
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`🌐 WhatsApp HTTP bridge listening on http://127.0.0.1:${PORT}`);
});

// ── Start WhatsApp ──────────────────────────────────────────────────────────
console.log('🔗 Starting WhatsApp gateway…');
gateway.start().catch(err => {
  console.error('💥 WhatsApp failed to start:', err.message);
});
