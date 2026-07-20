import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PackId, PlanId } from './catalog.js';
import { loadEnvFile, publicOrigin } from './env.js';
import {
  getDefaultProviderId,
  getProvider,
  isProviderId,
  providerStatus,
  returnUrls,
  tripayDefaultMethod,
  type ProviderId,
} from './providers.js';
import {
  burnCredits,
  buyPack,
  buyPlan,
  cancelAtPeriodEnd,
  dismissCallout,
  finalizePayment,
  getSnapshot,
  grantBonus,
  resetPeriod,
  seed,
  setPaymentMode,
  setProvider,
  simulatePayment,
  type CreateLinkFn,
  type SeedTemplate,
} from './store.js';

loadEnvFile();

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

const origin = publicOrigin();
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  origin,
  origin.replace('https://', 'http://'),
  'https://demo.betterpay.dev',
  'http://demo.betterpay.dev',
];

app.use(
  '/api/*',
  cors({
    origin: (o) => (o && allowedOrigins.includes(o) ? o : allowedOrigins[0]),
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'X-Webhook-Token', 'svix-id', 'svix-timestamp', 'svix-signature'],
  }),
);

function makeCreateLink(providerId: ProviderId): CreateLinkFn {
  return async ({ orderId, amount, label, customerEmail, customerName }) => {
    const provider = getProvider(providerId);
    const urls = returnUrls();
    const result = await provider.createPaymentLink({
      orderId,
      amount,
      currency: 'IDR',
      customerEmail,
      customerName,
      description: label,
      returnUrl: urls.returnUrl,
      // Provider webhooks hit /api/webhooks/*; customer return stays on /payments.
      callbackUrl:
        providerId === 'tripay'
          ? `${publicOrigin()}/api/webhooks/tripay`
          : urls.callbackUrl,
      expiryMinutes: 60,
      items: [{ name: label, price: amount, quantity: 1 }],
      ...(providerId === 'tripay'
        ? { paymentMethod: tripayDefaultMethod() }
        : {}),
    });
    if (!result.paymentUrl) {
      throw new Error(`${providerId}: provider returned no payment URL`);
    }
    return {
      paymentUrl: result.paymentUrl,
      providerTransactionId: result.providerTransactionId || orderId,
      provider: providerId,
    };
  };
}

const api = new Hono();

function withProviders<T extends Record<string, unknown>>(snap: T) {
  return { ...snap, providers: providerStatus() };
}

api.get('/health', (c) =>
  c.json({
    ok: true,
    service: 'demo-corp',
    origin: publicOrigin(),
    providers: providerStatus(),
  }),
);

api.get('/state', (c) => c.json(withProviders(getSnapshot())));

api.post('/seed', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { template?: SeedTemplate };
  return c.json(withProviders(seed(body.template ?? 'empty_free')));
});

api.post('/payment-mode', async (c) => {
  const body = (await c.req.json()) as { mode: 'simulate' | 'live' };
  return c.json(withProviders(setPaymentMode(body.mode)));
});

api.post('/provider', async (c) => {
  const body = (await c.req.json()) as { provider: string };
  if (!isProviderId(body.provider)) {
    return c.json(
      { error: 'provider must be sumopod, midtrans, xendit, or tripay' },
      400,
    );
  }
  return c.json(withProviders(setProvider(body.provider)));
});

api.post('/burn', async (c) => {
  const body = (await c.req.json()) as { amount?: number };
  return c.json(withProviders(burnCredits(body.amount ?? 10)));
});

api.post('/grant', async (c) => {
  const body = (await c.req.json()) as { amount?: number };
  return c.json(withProviders(grantBonus(body.amount ?? 100)));
});

api.post('/reset-period', (c) => c.json(withProviders(resetPeriod())));

api.post('/buy-plan', async (c) => {
  const body = (await c.req.json()) as {
    planId: PlanId;
    interval?: 'month' | 'year';
    provider?: ProviderId;
  };
  try {
    const snap = getSnapshot();
    const providerId = body.provider ?? snap.provider ?? getDefaultProviderId();
    const createLink =
      snap.paymentMode === 'live' ? makeCreateLink(providerId) : undefined;
    const result = await buyPlan(body.planId, body.interval ?? 'month', createLink);
    return c.json({
      ...result,
      snapshot: withProviders(result.snapshot),
    });
  } catch (e) {
    return c.json({ error: (e as Error).message }, 400);
  }
});

api.post('/buy-pack', async (c) => {
  const body = (await c.req.json()) as { packId: PackId; provider?: ProviderId };
  try {
    const snap = getSnapshot();
    const providerId = body.provider ?? snap.provider ?? getDefaultProviderId();
    const createLink =
      snap.paymentMode === 'live' ? makeCreateLink(providerId) : undefined;
    const result = await buyPack(body.packId, createLink);
    return c.json({
      ...result,
      snapshot: withProviders(result.snapshot),
    });
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
    return c.json(withProviders(simulatePayment(body.paymentId, body.outcome ?? 'paid')));
  } catch (e) {
    return c.json({ error: (e as Error).message }, 400);
  }
});

api.post('/cancel', async (c) => {
  const body = (await c.req.json()) as { cancelAtPeriodEnd?: boolean };
  return c.json(withProviders(cancelAtPeriodEnd(body.cancelAtPeriodEnd !== false)));
});

api.post('/dismiss-callout', (c) => c.json(withProviders(dismissCallout())));

/** SumoPod webhook — configure URL: https://demo.betterpay.dev/api/webhooks/sumopod */
api.post('/webhooks/sumopod', async (c) => {
  const rawBody = await c.req.text();
  const headers: Record<string, string> = {};
  c.req.raw.headers.forEach((v, k) => {
    headers[k] = v;
  });

  try {
    const provider = getProvider('sumopod');
    const ok = await provider.verifyWebhook({ body: rawBody, headers });
    // Allow through when webhook auth is not configured (sandbox dogfood).
    const authConfigured = Boolean(
      process.env.SUMOPOD_WEBHOOK_SECRET?.trim() ||
        process.env.SUMOPOD_WEBHOOK_TOKEN?.trim(),
    );
    if (authConfigured && !ok) {
      return c.json({ error: 'invalid signature' }, 401);
    }

    const events = await provider.normalizeWebhook({ body: rawBody, headers });
    for (const ev of events) {
      const payload = ev.payload as Record<string, unknown>;
      const outcome =
        ev.name === 'payment.completed'
          ? 'paid'
          : ev.name === 'payment.failed'
            ? 'failed'
            : ev.name === 'payment.expired'
              ? 'expired'
              : null;
      if (!outcome) continue;
      try {
        finalizePayment(
          {
            providerTransactionId: String(
              payload.payment_id ?? payload.providerTransactionId ?? '',
            ),
            orderId: String(payload.order_id ?? payload.orderId ?? ''),
          },
          outcome,
        );
      } catch {
        // payment may not exist in this process memory
      }
    }
    return c.json({ received: true });
  } catch (e) {
    console.error('[sumopod webhook]', (e as Error).message);
    return c.json({ error: (e as Error).message }, 400);
  }
});

/** Midtrans notification URL: https://demo.betterpay.dev/api/webhooks/midtrans */
api.post('/webhooks/midtrans', async (c) => {
  const rawBody = await c.req.text();
  const headers: Record<string, string> = {};
  c.req.raw.headers.forEach((v, k) => {
    headers[k] = v;
  });

  try {
    const provider = getProvider('midtrans');
    const ok = await provider.verifyWebhook({ body: rawBody, headers });
    if (!ok) {
      return c.json({ error: 'invalid signature' }, 401);
    }
    const events = await provider.normalizeWebhook({ body: rawBody, headers });
    for (const ev of events) {
      const payload = ev.payload as Record<string, unknown>;
      const outcome = ev.name.includes('completed')
        ? 'paid'
        : ev.name.includes('failed') || ev.name.includes('canceled')
          ? 'failed'
          : ev.name.includes('expired')
            ? 'expired'
            : null;
      if (!outcome) continue;
      try {
        finalizePayment(
          {
            orderId: String(payload.order_id ?? ''),
            providerTransactionId: String(payload.transaction_id ?? ''),
          },
          outcome,
        );
      } catch {
        /* ignore missing */
      }
    }
    return c.json({ received: true });
  } catch (e) {
    console.error('[midtrans webhook]', (e as Error).message);
    return c.json({ error: (e as Error).message }, 400);
  }
});

/** Xendit webhook — https://demo.betterpay.dev/api/webhooks/xendit */
api.post('/webhooks/xendit', async (c) => {
  const rawBody = await c.req.text();
  const headers: Record<string, string> = {};
  c.req.raw.headers.forEach((v, k) => {
    headers[k] = v;
  });

  try {
    const provider = getProvider('xendit');
    const authConfigured = Boolean(
      process.env.XENDIT_WEBHOOK_VERIFICATION_TOKEN?.trim() ||
        process.env.XENDIT_WEBHOOK_SECRET?.trim() ||
        process.env.XENDIT_WEBHOOK_TOKEN?.trim(),
    );
    if (authConfigured) {
      try {
        const ok = await provider.verifyWebhook({ body: rawBody, headers });
        if (!ok) {
          return c.json({ error: 'invalid signature' }, 401);
        }
      } catch (e) {
        // Some Xendit events use callback token header instead of body HMAC.
        const token =
          headers['x-callback-token'] ||
          headers['X-Callback-Token'] ||
          '';
        const expected =
          process.env.XENDIT_WEBHOOK_VERIFICATION_TOKEN?.trim() ||
          process.env.XENDIT_WEBHOOK_TOKEN?.trim() ||
          '';
        if (!expected || token !== expected) {
          console.error('[xendit webhook]', (e as Error).message);
          return c.json({ error: 'invalid signature' }, 401);
        }
      }
    }

    const events = await provider.normalizeWebhook({ body: rawBody, headers });
    for (const ev of events) {
      const payload = ev.payload as Record<string, unknown>;
      const outcome =
        ev.name === 'payment.completed'
          ? 'paid'
          : ev.name === 'payment.failed'
            ? 'failed'
            : ev.name === 'payment.expired'
              ? 'expired'
              : null;
      if (!outcome) continue;
      try {
        finalizePayment(
          {
            orderId: String(
              payload.reference_id ?? payload.external_id ?? payload.order_id ?? '',
            ),
            providerTransactionId: String(payload.id ?? payload.payment_id ?? ''),
          },
          outcome,
        );
      } catch {
        /* ignore missing */
      }
    }
    return c.json({ received: true });
  } catch (e) {
    console.error('[xendit webhook]', (e as Error).message);
    return c.json({ error: (e as Error).message }, 400);
  }
});

/** Tripay callback — https://demo.betterpay.dev/api/webhooks/tripay */
api.post('/webhooks/tripay', async (c) => {
  const rawBody = await c.req.text();
  const headers: Record<string, string> = {};
  c.req.raw.headers.forEach((v, k) => {
    headers[k.toLowerCase()] = v;
  });

  try {
    const provider = getProvider('tripay');
    const ok = await provider.verifyWebhook({ body: rawBody, headers });
    if (!ok) {
      return c.json({ error: 'invalid signature' }, 401);
    }
    const events = await provider.normalizeWebhook({ body: rawBody, headers });
    for (const ev of events) {
      const payload = ev.payload as Record<string, unknown>;
      const outcome =
        ev.name === 'payment.completed'
          ? 'paid'
          : ev.name === 'payment.failed'
            ? 'failed'
            : ev.name === 'payment.expired'
              ? 'expired'
              : null;
      if (!outcome) continue;
      try {
        finalizePayment(
          {
            orderId: String(payload.merchant_ref ?? payload.order_id ?? ''),
            providerTransactionId: String(
              payload.reference ?? payload.providerTransactionId ?? '',
            ),
          },
          outcome,
        );
      } catch {
        /* ignore missing */
      }
    }
    return c.json({ received: true });
  } catch (e) {
    console.error('[tripay webhook]', (e as Error).message);
    return c.json({ error: (e as Error).message }, 400);
  }
});

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
  `DEMO CORP demo → http://${host}:${port}` +
    (hasDist ? ' (api + static dist)' : ' (api only)') +
    ` · ${publicOrigin()} · provider=${getDefaultProviderId()}`,
);
serve({ fetch: app.fetch, port, hostname: host });
