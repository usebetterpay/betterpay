#!/usr/bin/env node
/**
 * Local Duitku callback catcher (form-urlencoded) + optional create helper.
 *
 * Env:
 *   PORT                 default 9092
 *   DUITKU_API_KEY       required for signature verify + create
 *   DUITKU_MERCHANT_CODE required for create
 *   SKIP_VERIFY=1        accept all callbacks without HMAC check
 *
 * Endpoints:
 *   GET  /health
 *   GET  /events
 *   POST /webhooks/duitku   ← set this as Project Callback URL in Duitku
 *   POST /callback          alias
 *   POST /create-payment    JSON { orderId?, amount?, paymentMethod? }
 */

import { createServer } from 'node:http';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 9092);
const API_KEY = process.env.DUITKU_API_KEY || '';
const MERCHANT_CODE = process.env.DUITKU_MERCHANT_CODE || '';
const SKIP_VERIFY =
  process.env.SKIP_VERIFY === '1' || !API_KEY;
const IS_SANDBOX = process.env.DUITKU_SANDBOX !== '0';
const BASE = IS_SANDBOX
  ? 'https://sandbox.duitku.com/webapi/api/merchant'
  : 'https://passport.duitku.com/webapi/api/merchant';

const LOG_DIR = join(__dirname, '..', '.webhook-logs');
const events = [];
const MAX_EVENTS = 100;

function hmac(msg, key) {
  return createHmac('sha256', key).update(msg, 'utf8').digest('hex');
}

function ctEqual(a, b) {
  const ba = Buffer.from(String(a).toLowerCase(), 'utf8');
  const bb = Buffer.from(String(b).toLowerCase(), 'utf8');
  if (ba.length !== bb.length) return false;
  if (ba.length === 0) return true;
  return timingSafeEqual(ba, bb);
}

function verifyCallback(rawBody) {
  if (SKIP_VERIFY) return { ok: true, mode: 'skip' };
  try {
    const params = new URLSearchParams(rawBody);
    const merchantCode = params.get('merchantCode') ?? '';
    const amount = params.get('amount') ?? '';
    const merchantOrderId = params.get('merchantOrderId') ?? '';
    const signature = params.get('signature') ?? '';
    if (!signature) return { ok: false, mode: 'hmac' };
    const expected = hmac(`${merchantCode}${amount}${merchantOrderId}`, API_KEY);
    return { ok: ctEqual(signature, expected), mode: 'hmac' };
  } catch {
    return { ok: false, mode: 'hmac' };
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function json(res, status, data) {
  const body = JSON.stringify(data, null, 2);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(body);
}

function text(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'text/plain' });
  res.end(body);
}

function pushEvent(entry) {
  events.unshift(entry);
  if (events.length > MAX_EVENTS) events.length = MAX_EVENTS;
  try {
    if (!existsSync(LOG_DIR)) mkdirSync(LOG_DIR, { recursive: true });
    const file = join(LOG_DIR, `${Date.now()}-${entry.id || 'evt'}.json`);
    writeFileSync(file, JSON.stringify(entry, null, 2));
  } catch {
    /* ignore */
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://127.0.0.1:${PORT}`);
  const path = url.pathname.replace(/\/+$/, '') || '/';

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': '*',
    });
    return res.end();
  }

  if (req.method === 'GET' && (path === '/' || path === '/health')) {
    return json(res, 200, {
      ok: true,
      service: 'betterpay-duitku-callback-receiver',
      port: PORT,
      verify: SKIP_VERIFY
        ? 'SKIP (set DUITKU_API_KEY for HMAC verify)'
        : 'hmac',
      merchantCode: MERCHANT_CODE ? '[set]' : '[missing]',
      events: events.length,
      callbackPath: '/webhooks/duitku',
    });
  }

  if (req.method === 'GET' && path === '/events') {
    return json(res, 200, { count: events.length, events });
  }

  if (req.method === 'POST' && path === '/create-payment') {
    if (!API_KEY || !MERCHANT_CODE) {
      return json(res, 400, {
        error: 'Set DUITKU_API_KEY and DUITKU_MERCHANT_CODE',
      });
    }
    const raw = await readBody(req);
    let input = {};
    try {
      input = raw ? JSON.parse(raw) : {};
    } catch {
      return json(res, 400, { error: 'invalid JSON' });
    }
    const orderId = String(input.orderId || input.order_id || `bp_dk_${Date.now()}`).slice(0, 50);
    const amount = Math.trunc(Number(input.amount || 10_000));
    const paymentMethod = String(input.paymentMethod || 'SP').slice(0, 2);
    const callbackUrl =
      input.callbackUrl ||
      process.env.DUITKU_CALLBACK_URL ||
      `http://127.0.0.1:${PORT}/webhooks/duitku`;
    const returnUrl = input.returnUrl || 'https://example.com/return';
    const signature = hmac(`${MERCHANT_CODE}${orderId}${amount}`, API_KEY);
    const body = {
      merchantCode: MERCHANT_CODE,
      paymentAmount: amount,
      paymentMethod,
      merchantOrderId: orderId,
      productDetails: input.description || `Order ${orderId}`,
      customerVaName: String(input.customerName || 'BetterPay').slice(0, 20),
      email: input.customerEmail || 'e2e@betterpay.test',
      callbackUrl,
      returnUrl,
      signature,
      expiryPeriod: 60,
    };
    try {
      const r = await fetch(`${BASE}/v2/inquiry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const textBody = await r.text();
      let data;
      try {
        data = JSON.parse(textBody);
      } catch {
        data = { raw: textBody };
      }
      return json(res, r.status, data);
    } catch (e) {
      return json(res, 502, { error: String(e.message || e) });
    }
  }

  if (
    req.method === 'POST' &&
    (path === '/webhooks/duitku' ||
      path === '/callback' ||
      path === '/webhooks' ||
      path === '/webhook')
  ) {
    const rawBody = await readBody(req);
    const v = verifyCallback(rawBody);
    let parsed = {};
    try {
      parsed = Object.fromEntries(new URLSearchParams(rawBody));
    } catch {
      parsed = { _raw: rawBody.slice(0, 500) };
    }

    const entry = {
      id: `dk_${Date.now()}`,
      provider: 'duitku',
      receivedAt: new Date().toISOString(),
      verify: v,
      contentType: req.headers['content-type'],
      body: parsed,
      rawLength: rawBody.length,
    };
    pushEvent(entry);

    console.log(
      `\n📩 Duitku callback ${entry.receivedAt} verify=${v.mode}:${v.ok ? 'OK' : 'FAIL'}`,
    );
    console.log(
      '   result:',
      parsed.resultCode,
      'order:',
      parsed.merchantOrderId,
      'ref:',
      parsed.reference,
      'amount:',
      parsed.amount,
    );

    if (!v.ok) {
      return json(res, 401, { error: 'Invalid signature', mode: v.mode });
    }
    // Duitku expects plain OK / 200
    return text(res, 200, 'OK');
  }

  json(res, 404, { error: 'not found', path });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║  BetterPay · Duitku callback receiver                    ║
╠══════════════════════════════════════════════════════════╣
║  Local:    http://127.0.0.1:${String(PORT).padEnd(5)}                        ║
║  Callback: POST /webhooks/duitku                         ║
║  Events:   GET  /events                                  ║
║  Verify:   ${SKIP_VERIFY ? 'SKIP (open)' : 'HMAC-SHA256'}                              ║
╚══════════════════════════════════════════════════════════╝
`);
  if (!MERCHANT_CODE) {
    console.log('⚠️  DUITKU_MERCHANT_CODE not set — /create-payment disabled.\n');
  }
  if (SKIP_VERIFY) {
    console.log('⚠️  Verification skipped — set DUITKU_API_KEY for real HMAC checks.\n');
  }
});
