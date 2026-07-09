#!/usr/bin/env node
/**
 * Local SumoPod webhook catcher for tunnel testing.
 *
 * Env:
 *   PORT                 default 8081 (matches existing ngrok → localhost:8081)
 *   SUMOPOD_API_KEY      optional — if set, create payment via BetterPay path
 *   SUMOPOD_WEBHOOK_SECRET  whsec_… (preferred)
 *   SUMOPOD_WEBHOOK_TOKEN   whtok_… (alternative)
 *   SKIP_VERIFY=1        accept all webhooks (log only) — default if no secret/token
 *
 * Endpoints:
 *   GET  /health
 *   GET  /events           last N received webhooks (JSON)
 *   POST /webhooks/sumopod  SumoPod webhook URL
 *   POST /create-payment   body: { orderId?, amount? } — sandbox create (needs API key)
 */

import { createServer } from 'node:http';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8081);
const API_KEY = process.env.SUMOPOD_API_KEY || '';
const WEBHOOK_SECRET = process.env.SUMOPOD_WEBHOOK_SECRET || '';
const WEBHOOK_TOKEN = process.env.SUMOPOD_WEBHOOK_TOKEN || '';
const SKIP_VERIFY =
  process.env.SKIP_VERIFY === '1' || (!WEBHOOK_SECRET && !WEBHOOK_TOKEN);
const SANDBOX_BASE =
  process.env.SUMOPOD_BASE_URL ||
  'https://api-pay-sandbox.sumopod.com/api/v1';

const LOG_DIR = join(__dirname, '..', '.webhook-logs');
const events = [];
const MAX_EVENTS = 100;

function hdr(headers, name) {
  const lower = name.toLowerCase();
  for (const [k, v] of Object.entries(headers)) {
    if (k.toLowerCase() === lower) return Array.isArray(v) ? v[0] : v;
  }
  return undefined;
}

function ctEqual(a, b) {
  const ba = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ba.length !== bb.length) return false;
  if (ba.length === 0) return true;
  return timingSafeEqual(ba, bb);
}

function verifySignature(secret, id, ts, sigHeader, rawBody) {
  if (!secret || !id || !ts || !sigHeader) return false;
  const b64 = secret.startsWith('whsec_') ? secret.slice(6) : secret;
  let key;
  try {
    key = Buffer.from(b64, 'base64');
  } catch {
    return false;
  }
  if (!key.length) return false;
  const expected = createHmac('sha256', key)
    .update(`${id}.${ts}.${rawBody}`, 'utf8')
    .digest('base64');
  const parts = String(sigHeader)
    .split(' ')
    .map((p) => {
      const i = p.indexOf(',');
      return i >= 0 ? p.slice(i + 1) : p;
    })
    .filter(Boolean);
  return parts.some((s) => ctEqual(s, expected));
}

function verify(rawBody, headers) {
  if (SKIP_VERIFY) return { ok: true, mode: 'skip' };
  if (WEBHOOK_SECRET) {
    const ok = verifySignature(
      WEBHOOK_SECRET,
      hdr(headers, 'svix-id'),
      hdr(headers, 'svix-timestamp'),
      hdr(headers, 'svix-signature'),
      rawBody,
    );
    return { ok, mode: 'svix' };
  }
  if (WEBHOOK_TOKEN) {
    const ok = ctEqual(WEBHOOK_TOKEN, hdr(headers, 'x-webhook-token') || '');
    return { ok, mode: 'token' };
  }
  return { ok: false, mode: 'none' };
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
    /* ignore disk errors */
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
      service: 'betterpay-sumopod-webhook-receiver',
      port: PORT,
      verify: SKIP_VERIFY
        ? 'SKIP (set SUMOPOD_WEBHOOK_SECRET or SUMOPOD_WEBHOOK_TOKEN)'
        : WEBHOOK_SECRET
          ? 'svix'
          : 'token',
      events: events.length,
      webhookPath: '/webhooks/sumopod',
    });
  }

  if (req.method === 'GET' && path === '/events') {
    return json(res, 200, { count: events.length, events });
  }

  if (req.method === 'POST' && path === '/create-payment') {
    if (!API_KEY) {
      return json(res, 400, {
        error: 'Set SUMOPOD_API_KEY to create sandbox payments',
      });
    }
    const raw = await readBody(req);
    let input = {};
    try {
      input = raw ? JSON.parse(raw) : {};
    } catch {
      return json(res, 400, { error: 'invalid JSON' });
    }
    const orderId =
      input.orderId || input.order_id || `bp_wh_${Date.now()}`;
    const amount = Number(input.amount || 10_000);
    const body = {
      order_id: String(orderId).replace(/[^a-zA-Z0-9-_]/g, '-').slice(0, 64),
      amount: Math.trunc(amount),
      currency: 'IDR',
      expires_in_hours: 1,
      success_return_url: 'https://example.com/ok',
      cancel_return_url: 'https://example.com/cancel',
    };
    try {
      const r = await fetch(`${SANDBOX_BASE}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY,
        },
        body: JSON.stringify(body),
      });
      const text = await r.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text };
      }
      return json(res, r.status, data);
    } catch (e) {
      return json(res, 502, { error: String(e.message || e) });
    }
  }

  if (
    req.method === 'POST' &&
    (path === '/webhooks/sumopod' || path === '/webhook' || path === '/webhooks')
  ) {
    const rawBody = await readBody(req);
    const headers = Object.fromEntries(
      Object.entries(req.headers).map(([k, v]) => [
        k,
        Array.isArray(v) ? v.join(',') : String(v ?? ''),
      ]),
    );
    const v = verify(rawBody, headers);
    let parsed = null;
    try {
      parsed = JSON.parse(rawBody);
    } catch {
      parsed = { _parseError: true, raw: rawBody.slice(0, 500) };
    }

    const entry = {
      id: hdr(headers, 'svix-id') || `local_${Date.now()}`,
      receivedAt: new Date().toISOString(),
      verify: v,
      headers: {
        'svix-id': hdr(headers, 'svix-id'),
        'svix-timestamp': hdr(headers, 'svix-timestamp'),
        'svix-signature': hdr(headers, 'svix-signature')
          ? '[present]'
          : undefined,
        'x-webhook-token': hdr(headers, 'x-webhook-token')
          ? '[present]'
          : undefined,
        'content-type': hdr(headers, 'content-type'),
      },
      body: parsed,
      rawLength: rawBody.length,
    };
    pushEvent(entry);

    console.log(
      `\n📩 Webhook ${entry.receivedAt} verify=${v.mode}:${v.ok ? 'OK' : 'FAIL'}`,
    );
    console.log(
      '   event:',
      parsed?.event_type ?? '(unknown)',
      'order:',
      parsed?.data?.order_id ?? '-',
      'payment:',
      parsed?.data?.payment_id ?? '-',
    );
    console.log('   → GET /events for full dump\n');

    if (!v.ok) {
      return json(res, 401, { error: 'Invalid webhook signature/token', mode: v.mode });
    }
    // SumoPod expects 2xx within 10s
    return json(res, 200, { received: true, event_type: parsed?.event_type });
  }

  json(res, 404, { error: 'not found', path });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║  BetterPay · SumoPod webhook receiver                    ║
╠══════════════════════════════════════════════════════════╣
║  Local:   http://127.0.0.1:${String(PORT).padEnd(5)}                         ║
║  Path:    POST /webhooks/sumopod                         ║
║  Events:  GET  /events                                   ║
║  Verify:  ${SKIP_VERIFY ? 'SKIP (open)' : WEBHOOK_SECRET ? 'svix secret' : 'token     '}                              ║
╚══════════════════════════════════════════════════════════╝
`);
  if (SKIP_VERIFY) {
    console.log(
      '⚠️  Verification skipped — set SUMOPOD_WEBHOOK_SECRET or SUMOPOD_WEBHOOK_TOKEN for real checks.\n',
    );
  }
});
