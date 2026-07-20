import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
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

const app = new Hono().basePath('/api');

app.use(
  '*',
  cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  }),
);

app.get('/health', (c) => c.json({ ok: true, service: 'acme-ai-dogfood' }));

app.get('/state', (c) => c.json(getSnapshot()));

app.post('/seed', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { template?: SeedTemplate };
  const template = body.template ?? 'empty_free';
  return c.json(seed(template));
});

app.post('/payment-mode', async (c) => {
  const body = (await c.req.json()) as { mode: 'simulate' | 'live' };
  return c.json(setPaymentMode(body.mode));
});

app.post('/burn', async (c) => {
  const body = (await c.req.json()) as { amount?: number };
  return c.json(burnCredits(body.amount ?? 10));
});

app.post('/grant', async (c) => {
  const body = (await c.req.json()) as { amount?: number };
  return c.json(grantBonus(body.amount ?? 100));
});

app.post('/reset-period', (c) => c.json(resetPeriod()));

app.post('/buy-plan', async (c) => {
  const body = (await c.req.json()) as { planId: PlanId; interval?: 'month' | 'year' };
  try {
    return c.json(buyPlan(body.planId, body.interval ?? 'month'));
  } catch (e) {
    return c.json({ error: (e as Error).message }, 400);
  }
});

app.post('/buy-pack', async (c) => {
  const body = (await c.req.json()) as { packId: PackId };
  try {
    return c.json(buyPack(body.packId));
  } catch (e) {
    return c.json({ error: (e as Error).message }, 400);
  }
});

app.post('/simulate-payment', async (c) => {
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

app.post('/cancel', async (c) => {
  const body = (await c.req.json()) as { cancelAtPeriodEnd?: boolean };
  return c.json(cancelAtPeriodEnd(body.cancelAtPeriodEnd !== false));
});

app.post('/dismiss-callout', (c) => c.json(dismissCallout()));

const port = Number(process.env.DOGFOOD_API_PORT ?? 8787);
console.log(`Acme AI dogfood API → http://127.0.0.1:${port}`);
serve({ fetch: app.fetch, port, hostname: '127.0.0.1' });
