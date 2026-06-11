// ── Integration test: billing plugin wired into core factory ─────────────
// Tests that pay.billing.* methods work when billing() plugin is loaded.

import { describe, it, expect, beforeEach } from 'vitest';
import { betterPay } from '../../src/create-betterpay';
import type { PaymentProvider } from '../../src/provider/interface';
import { vi } from 'vitest';

// ── Mock provider ────────────────────────────────────────────────────────

function createMockProvider(): PaymentProvider & { priority?: number } {
  return {
    id: 'mock',
    name: 'Mock',
    paymentMethods: ['virtual_account'],
    capabilities: { paymentLink: true, recurring: false, refund: false },
    priority: 1,
    getApiEndpoint: () => 'https://api.mock.test',
    createPaymentLink: vi.fn().mockResolvedValue({
      providerTransactionId: 'mock_txn_001',
      paymentUrl: 'https://checkout.mock.test/abc',
      amount: 199000,
      currency: 'IDR',
      status: 'active' as const,
      raw: {},
    }),
    verifyWebhook: vi.fn().mockResolvedValue(true),
    normalizeWebhook: vi.fn().mockResolvedValue([]),
  };
}

// ── Inline billing types (avoids importing from @betterpay/billing in core tests) ──

// We simulate the billing plugin by creating a plugin with $Infer.billing
// This tests the structural bridge without a hard dep.

interface InlinePlan {
  id: string;
  group: string;
  name: string;
  price?: { amount: number; currency: string; interval?: string };
  default?: boolean;
  includes: Array<{ featureId: string; type: string; metered?: { limit: number; reset: string } }>;
}

function createInlineBillingPlugin(plans: InlinePlan[]) {
  // Simulate what @betterpay/billing does
  const subRecords = new Map<string, any>();
  const entRecords = new Map<string, any[]>();
  const custRecords = new Map<string, any>();
  const invRecords = new Map<string, any[]>();
  let subId = 0;
  let custId = 0;
  let entId = 0;
  let invId = 0;

  const schema = {
    plans: plans.map((p) => ({
      id: p.id,
      group: p.group,
      name: p.name,
      isDefault: p.default ?? false,
      priceAmount: p.price?.amount ?? null,
      priceCurrency: p.price?.currency ?? null,
      priceInterval: p.price?.interval ?? null,
      features: p.includes,
      hash: 'test_hash',
    })),
    planMap: new Map(),
  };
  for (const p of schema.plans) {
    schema.planMap.set(p.id, p);
  }

  const billingData = {
    products: plans,
    schema,
    subscription: {
      async subscribe(input: any) {
        const id = `sub_${++subId}`;
        const isPaid = input.plan.price && input.plan.price.amount > 0;
        const record = { id, customerId: input.customerId, planId: input.plan.id, group: input.plan.group, status: isPaid ? 'scheduled' : 'active', cancelAtPeriodEnd: false, currentPeriodStartAt: null, currentPeriodEndAt: null, createdAt: new Date(), updatedAt: new Date() };
        subRecords.set(id, record);
        return record;
      },
      async activate(id: string, start: Date, end: Date) {
        const r = subRecords.get(id);
        if (!r) return undefined;
        r.status = 'active';
        r.currentPeriodStartAt = start;
        r.currentPeriodEndAt = end;
        return r;
      },
      async cancel(id: string) {
        const r = subRecords.get(id);
        if (!r) return undefined;
        r.status = 'canceled';
        return r;
      },
      async upgrade(input: any) { return input; },
      async downgrade(input: any) { return input; },
      async getActive(customerId: string, group: string) {
        return Array.from(subRecords.values()).find(
          (r: any) => r.customerId === customerId && r.group === group && r.status === 'active',
        );
      },
    },
    entitlement: {
      async createEntitlements(customerId: string, subscriptionId: string, features: any[]) {
        const ents = features.map((f: any) => ({
          id: `ent_${++entId}`,
          customerId,
          featureId: f.featureId,
          subscriptionId,
          limit: f.metered?.limit ?? null,
          used: 0,
          nextResetAt: f.metered ? new Date(Date.now() + 30 * 86400000) : null,
        }));
        entRecords.set(`${customerId}:${subscriptionId}`, ents);
      },
      async check(customerId: string, featureId: string) {
        for (const [, ents] of entRecords) {
          const ent = ents.find((e: any) => e.customerId === customerId && e.featureId === featureId);
          if (ent) {
            const remaining = ent.limit === null ? null : ent.limit - ent.used;
            return {
              allowed: ent.limit === null || remaining! > 0,
              balance: { featureId, limit: ent.limit, remaining, resetAt: ent.nextResetAt, unlimited: ent.limit === null },
            };
          }
        }
        return { allowed: false, balance: { featureId, limit: 0, remaining: 0, resetAt: null, unlimited: false } };
      },
      async report(customerId: string, featureId: string, amount: number) {
        for (const [, ents] of entRecords) {
          const ent = ents.find((e: any) => e.customerId === customerId && e.featureId === featureId);
          if (ent) {
            ent.used += amount;
            const remaining = ent.limit === null ? null : ent.limit - ent.used;
            return {
              success: true,
              balance: { featureId, limit: ent.limit, remaining, resetAt: ent.nextResetAt, unlimited: ent.limit === null },
            };
          }
        }
        return { success: false, balance: { featureId, limit: 0, remaining: 0, resetAt: null, unlimited: false } };
      },
      async removeBySubscription(_subscriptionId: string) {},
    },
    customer: {
      async create(data: any) {
        const id = `cust_${++custId}`;
        const record = { id, email: data.email, name: data.name, createdAt: new Date(), updatedAt: new Date() };
        custRecords.set(id, record);
        return record;
      },
      async getById(id: string) { return custRecords.get(id); },
      async getByEmail(email: string) {
        return Array.from(custRecords.values()).find((r: any) => r.email === email);
      },
      async getOrCreate(email: string, name?: string) {
        const existing = Array.from(custRecords.values()).find((r: any) => r.email === email);
        if (existing) return existing;
        const id = `cust_${++custId}`;
        const record = { id, email, name, createdAt: new Date(), updatedAt: new Date() };
        custRecords.set(id, record);
        return record;
      },
      async delete(id: string) { custRecords.delete(id); },
    },
    invoice: {
      async create(data: any) {
        const id = `inv_${++invId}`;
        const record = { id, ...data, status: 'open', paidAt: null, createdAt: new Date(), updatedAt: new Date() };
        const existing = invRecords.get(data.subscriptionId) ?? [];
        existing.push(record);
        invRecords.set(data.subscriptionId, existing);
        return record;
      },
      async getBySubscription(subscriptionId: string) {
        return invRecords.get(subscriptionId) ?? [];
      },
      async markPaid(id: string) {
        for (const [, invs] of invRecords) {
          const inv = invs.find((i: any) => i.id === id);
          if (inv) { inv.status = 'paid'; inv.paidAt = new Date(); return inv; }
        }
        return undefined;
      },
    },
    billingCycle: {
      async run() {
        return { processed: 0, succeeded: 0, failed: 0, errors: [] };
      },
    },
  };

  return {
    id: 'billing',
    version: '0.1.0',
    $Infer: { billing: billingData },
    $ERROR_CODES: {},
  };
}

describe('Billing Integration via Core Factory', () => {
  const freePlan: InlinePlan = {
    id: 'free', group: 'base', name: 'Free', default: true,
    includes: [{ featureId: 'messages', type: 'metered', metered: { limit: 100, reset: 'month' } }],
  };

  const proPlan: InlinePlan = {
    id: 'pro', group: 'base', name: 'Pro',
    price: { amount: 199000, currency: 'IDR', interval: 'month' },
    includes: [
      { featureId: 'messages', type: 'metered', metered: { limit: 5000, reset: 'month' } },
      { featureId: 'ai-models', type: 'boolean' },
    ],
  };

  let pay: ReturnType<typeof betterPay>;

  beforeEach(() => {
    pay = betterPay({
      plugins: [
        { id: 'mock-plugin', providers: [createMockProvider()] },
        createInlineBillingPlugin([freePlan, proPlan]),
      ],
    });
  });

  it('billing is enabled when billing plugin is loaded', () => {
    expect(pay.billing.enabled).toBe(true);
    expect(pay.billing.services).not.toBeNull();
  });

  it('createCustomer creates a customer', async () => {
    const customer = await pay.billing.createCustomer({ email: 'budi@test.com', name: 'Budi' });
    expect(customer.id).toMatch(/^cust_/);
    expect(customer.email).toBe('budi@test.com');
  });

  it('subscribe to free plan creates active subscription with entitlements', async () => {
    const result = await pay.billing.subscribe({ customerId: 'cust_1', planId: 'free' });
    expect(result.subscriptionId).toMatch(/^sub_/);
    expect(result.status).toBe('active');

    // Entitlements should be created
    const check = await pay.billing.check({ customerId: 'cust_1', featureId: 'messages' });
    expect(check.allowed).toBe(true);
    expect((check.balance as any).remaining).toBe(100);
  });

  it('subscribe to paid plan creates scheduled subscription + payment link', async () => {
    const result = await pay.billing.subscribe({ customerId: 'cust_1', planId: 'pro' });
    expect(result.subscriptionId).toMatch(/^sub_/);
    expect(result.status).toBe('scheduled');
    expect(result.paymentUrl).toBe('https://checkout.mock.test/abc');
  });

  it('subscribe to unknown plan throws', async () => {
    await expect(pay.billing.subscribe({ customerId: 'cust_1', planId: 'nonexistent' }))
      .rejects.toThrow('Plan not found');
  });

  it('check returns not allowed for nonexistent entitlement', async () => {
    const result = await pay.billing.check({ customerId: 'nobody', featureId: 'messages' });
    expect(result.allowed).toBe(false);
  });

  it('report deducts usage', async () => {
    await pay.billing.subscribe({ customerId: 'cust_1', planId: 'free' });
    const result = await pay.billing.report({ customerId: 'cust_1', featureId: 'messages', amount: 10 });
    expect(result.success).toBe(true);
    expect((result.balance as any).remaining).toBe(90);
  });

  it('cancel subscription', async () => {
    const sub = await pay.billing.subscribe({ customerId: 'cust_1', planId: 'free' });
    const canceled = await pay.billing.cancel(sub.subscriptionId);
    expect((canceled as any).status).toBe('canceled');
  });

  it('getSubscription returns active subscription', async () => {
    await pay.billing.subscribe({ customerId: 'cust_1', planId: 'free' });
    const sub = await pay.billing.getSubscription('cust_1', 'base');
    expect(sub).toBeDefined();
    expect((sub as any).planId).toBe('free');
  });

  it('getCustomer returns customer by id', async () => {
    const created = await pay.billing.createCustomer({ email: 'test@test.com' });
    const fetched = await pay.billing.getCustomer(created.id);
    expect(fetched).toBeDefined();
    expect((fetched as any).email).toBe('test@test.com');
  });

  it('runBillingCycle returns result', async () => {
    const result = await pay.billing.runBillingCycle();
    expect(result).toHaveProperty('processed');
    expect(result).toHaveProperty('succeeded');
    expect(result).toHaveProperty('failed');
  });

  it('billing disabled when plugin not loaded', () => {
    const payNoBilling = betterPay({ plugins: [] });
    expect(payNoBilling.billing.enabled).toBe(false);
    expect(() => payNoBilling.billing.subscribe({ customerId: 'x', planId: 'y' }))
      .toThrow('Billing plugin not loaded');
  });
});
