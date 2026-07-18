#!/usr/bin/env node
/**
 * Local Midtrans notification catcher + optional Snap create helper.
 *
 * Env:
 *   PORT                 default 9093
 *   MIDTRANS_SERVER_KEY  required for signature verify + create
 *   MIDTRANS_CLIENT_KEY  optional
 *   SKIP_VERIFY=1        accept all notifications without SHA512 check
 *
 * Endpoints:
 *   GET  /health
 *   GET  /events
 *   POST /webhooks/midtrans   ← Payment Notification URL
 *   POST /notification        alias
 *   POST /create-payment      JSON { orderId?, amount? }
 */

import { createServer } from 'node:http';
import { createHash, timingSafeEqual } from 'node:crypto';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 9093);
const SERVER_KEY = process.env.MIDTRANS_SERVER_KEY || '';
const SKIP_VERIFY = process.env.SKIP_VERIFY === '1' || !SERVER_KEY;
const IS_SANDBOX = process.env.MIDTRANS_SANDBOX !== '0';
const BASE = IS_SANDBOX
  ? 'https://api.sandbox.midtrans.com'
  : 'https://api.midtrans.com';

const LOG_DIR = join(__dirname, '..', '.webhook-logs');
const events = [];
const MAX_EVENTS = 100;

function sha512(msg) {
  return createHash('sha512').update(msg, 'utf8').digest('hex');
}

function ctEqual(a, b) {
  const ba = Buffer.from(String(a).toLowerCase(), 'utf8');
  const bb = Buffer.from(String(b).toLowerCase(), 'utf8');
  if (ba.length !== bb.length) return false;
  if (ba.length === 0) return true;
  return timingSafeEqual(ba, bb);
}

function verifyNotification(rawBody) {
  if (SKIP_VERIFY) return { ok: true, mode: 'skip' };
  try {
    const parsed = JSON.parse(rawBody);
    const orderId = parsed.order_id ?? '';
    const statusCode = parsed.status_code ?? '';
    const grossAmount = parsed.gross_amount ?? '';
    const signature = parsed.signature_key ?? '';
    if (!signature) return { ok: false, mode: 'sha512' };
    const expected = sha512(`${orderId}${statusCode}${grossAmount}${SERVER_KEY}`);
    return { ok: ctEqual(signature, expected), mode: 'sha512' };
  } catch {
    return { ok: false, mode: 'sha512' };
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

const authHeader = SERVER_KEY
  ? `Basic ${Buffer.from(`${SERVER_KEY}:`).toString('base64')}`
  : '';

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
      service: 'betterpay-midtrans-notification-receiver',
      port: PORT,
      verify: SKIP_VERIFY
        ? 'SKIP (set MIDTRANS_SERVER_KEY for SHA512 verify)'
        : 'sha512',
      serverKey: SERVER_KEY ? '[set]' : '[missing]',
      events: events.length,
      notificationPath: '/webhooks/midtrans',
    });
  }

  if (req.method === 'GET' && path === '/events') {
    return json(res, 200, { count: events.length, events });
  }

  if (req.method === 'POST' && path === '/create-payment') {
    if (!SERVER_KEY) {
      return json(res, 400, { error: 'Set MIDTRANS_SERVER_KEY' });
    }
    const raw = await readBody(req);
    let input = {};
    try {
      input = raw ? JSON.parse(raw) : {};
    } catch {
      return json(res, 400, { error: 'invalid JSON' });
    }
    const orderId = String(input.orderId || input.order_id || `bp_mt_${Date.now()}`).slice(0, 50);
    const amount = Math.trunc(Number(input.amount || 10_000));
    const body = {
      transaction_details: { order_id: orderId, gross_amount: amount },
      customer_details: {
        email: input.customerEmail || 'e2e@betterpay.test',
        first_name: String(input.customerName || 'BetterPay').slice(0, 50),
      },
      item_details: [
        {
          id: 'item-1',
          name: input.description || `Order ${orderId}`,
          price: amount,
          quantity: 1,
        },
      ],
      callbacks: { finish: input.returnUrl || 'https://example.com/finish' },
    };
    try {
      const r = await fetch(`${BASE}/snap/v1/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: authHeader,
        },
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
    (path === '/webhooks/midtrans' ||
      path === '/notification' ||
      path === '/webhooks' ||
      path === '/webhook')
  ) {
    const rawBody = await readBody(req);
    const v = verifyNotification(rawBody);
    let parsed = {};
    try {
      parsed = JSON.parse(rawBody);
    } catch {
      parsed = { _raw: rawBody.slice(0, 500) };
    }

    const entry = {
      id: `mt_${Date.now()}`,
      provider: 'midtrans',
      receivedAt: new Date().toISOString(),
      verify: v,
      contentType: req.headers['content-type'],
      body: {
        ...parsed,
        signature_key: parsed.signature_key ? '[present]' : undefined,
      },
      rawLength: rawBody.length,
    };
    pushEvent(entry);

    console.log(
      `\n📩 Midtrans notification ${entry.receivedAt} verify=${v.mode}:${v.ok ? 'OK' : 'FAIL'}`,
    );
    console.log(
      '   status:',
      parsed.transaction_status,
      'order:',
      parsed.order_id,
      'txn:',
      parsed.transaction_id,
      'amount:',
      parsed.gross_amount,
    );

    if (!v.ok) {
      return json(res, 401, { error: 'Invalid signature_key', mode: v.mode });
    }
    // Midtrans expects 200
    return json(res, 200, { status: 'ok' });
  }

  json(res, 404, { error: 'not found', path });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║  BetterPay · Midtrans notification receiver              ║
╠══════════════════════════════════════════════════════════╣
║  Local:        http://127.0.0.1:${String(PORT).padEnd(5)}                    ║
║  Notification: POST /webhooks/midtrans                   ║
║  Events:       GET  /events                              ║
║  Verify:       ${SKIP_VERIFY ? 'SKIP (open)' : 'SHA512     '}                            ║
╚══════════════════════════════════════════════════════════╝
`);
  if (SKIP_VERIFY) {
    console.log('⚠️  Verification skipped — set MIDTRANS_SERVER_KEY for real checks.\n');
  }
});
