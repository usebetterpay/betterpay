import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PackId, PlanId } from './catalog.js';
import {
  burnCredits,
  buyPack,
  buyPlan,
  cancelAtPeriodEnd,
  dismissCallout,
  getSnapshot,
  grantBonus,
  resetPeriod,
  seed,
  setPaymentMode,
  simulatePayment,
  type SeedTemplate,
} from './store.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '../dist');
const hasDist = existsSync(path.join(distDir, 'index.html'));

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
  '.map': 'application/json',
};

const app = new Hono();

const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://dogfood.betterpay.dev',
  'http://dogfood.betterpay.dev',
];

app.use(
  '/api/*',
  cors({
    origin: (origin) => (origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0]),
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
  }),
);

const api = new Hono();

api.get('/health', (c) => c.json({ ok: true, service: 'acme-ai-dogfood' }));
api.get('/state', (c) => c.json(getSnapshot()));

api.post('/seed', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { template?: SeedTemplate };
  return c.json(seed(body.template ?? 'empty_free'));
});

api.post('/payment-mode', async (c) => {
  const body = (await c.req.json()) as { mode: 'simulate' | 'live' };
  return c.json(setPaymentMode(body.mode));
});

api.post('/burn', async (c) => {
  const body = (await c.req.json()) as { amount?: number };
  return c.json(burnCredits(body.amount ?? 10));
});

api.post('/grant', async (c) => {
  const body = (await c.req.json()) as { amount?: number };
  return c.json(grantBonus(body.amount ?? 100));
});

api.post('/reset-period', (c) => c.json(resetPeriod()));

api.post('/buy-plan', async (c) => {
  const body = (await c.req.json()) as { planId: PlanId; interval?: 'month' | 'year' };
  try {
    return c.json(buyPlan(body.planId, body.interval ?? 'month'));
  } catch (e) {
    return c.json({ error: (e as Error).message }, 400);
  }
});

api.post('/buy-pack', async (c) => {
  const body = (await c.req.json()) as { packId: PackId };
  try {
    return c.json(buyPack(body.packId));
  } catch (e) {
    return c.json({ error: (e as Error).message }, 400);
  }
});

api.post('/simulate-payment', async (c) => {
  const body = (await c.req.json()) as {
    paymentId: string;
    outcome?: 'paid' | 'failed' | 'expired';
  };
  try {
    return c.json(simulatePayment(body.paymentId, body.outcome ?? 'paid'));
  } catch (e) {
    return c.json({ error: (e as Error).message }, 400);
  }
});

api.post('/cancel', async (c) => {
  const body = (await c.req.json()) as { cancelAtPeriodEnd?: boolean };
  return c.json(cancelAtPeriodEnd(body.cancelAtPeriodEnd !== false));
});

api.post('/dismiss-callout', (c) => c.json(dismissCallout()));

app.route('/api', api);

async function serveDist(c: { req: { path: string } }) {
  const urlPath = c.req.path === '/' ? '/index.html' : c.req.path;
  const safe = path.normalize(urlPath).replace(/^(\.\.(\/|\\|$))+/, '');
  const filePath = path.join(distDir, safe);
  if (!filePath.startsWith(distDir)) {
    return new Response('Forbidden', { status: 403 });
  }
  if (existsSync(filePath) && !filePath.endsWith('/')) {
    const ext = path.extname(filePath);
    const body = await readFile(filePath);
    return new Response(body, {
      headers: {
        'Content-Type': MIME[ext] ?? 'application/octet-stream',
        'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=86400',
      },
    });
  }
  // SPA fallback
  const html = await readFile(path.join(distDir, 'index.html'));
  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' },
  });
}

if (hasDist) {
  app.get('*', (c) => serveDist(c));
}

const port = Number(process.env.DOGFOOD_API_PORT ?? 8791);
const host = process.env.DOGFOOD_HOST ?? '127.0.0.1';
console.log(
  `Acme AI dogfood → http://${host}:${port}` +
    (hasDist ? ' (api + static dist)' : ' (api only)'),
);
serve({ fetch: app.fetch, port, hostname: host });
