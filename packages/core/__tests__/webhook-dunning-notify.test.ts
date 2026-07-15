import { describe, it, expect, vi } from 'vitest';
import { betterPay } from '../src/create-betterpay';
import type { BetterPayPlugin } from '../src/plugin';
import type { PaymentProvider, PaymentLinkResult } from '../src/provider/interface';
import type { BillingPluginData } from '../src/billing-bridge';

const okResult = (): PaymentLinkResult => ({
  providerTransactionId: 'ext-1',
  paymentUrl: 'https://pay.example/1',
  amount: 100_000,
  currency: 'IDR',
  status: 'pending',
  raw: {},
});

function mockProvider(): PaymentProvider {
  return {
    id: 'mock',
    name: 'mock',
    paymentMethods: ['qris'],
    capabilities: { paymentLink: true, recurring: false, refund: false },
    createPaymentLink: async () => okResult(),
    verifyWebhook: async () => true,
    normalizeWebhook: async (data) => {
      const body = JSON.parse(data.body);
      return [
        {
          name: body.event ?? 'payment.completed',
          payload: body,
          providerEventId: body.event_id ?? `evt_${body.order_id}`,
        },
      ];
    },
    getApiEndpoint: () => 'https://example.com',
  };
}

/** Minimal billing surface with dunning + customer phone for factory wiring tests. */
function createBillingPlugin(): BetterPayPlugin {
  const customers = new Map<string, { id: string; email: string; phone?: string; name?: string }>();
  const subs = new Map<
    string,
    {
      id: string;
      customerId: string;
      planId: string;
      status: string;
      metadata: Record<string, string> | null;
      currentPeriodStartAt: Date | null;
      currentPeriodEndAt: Date | null;
    }
  >();
  let custN = 0;
  let subN = 0;

  const planDef = {
    id: 'pro',
    group: 'base',
    name: 'Pro',
    price: { amount: 100_000, currency: 'IDR', interval: 'month' },
    includes: [] as { featureId: string; type: string }[],
  };

  const billingData: BillingPluginData = {
    products: [planDef],
    schema: {
      plans: [],
      planMap: new Map(),
    },
    subscription: {
      async subscribe({ customerId, plan }) {
        const id = `sub_${++subN}`;
        const rec = {
          id,
          customerId,
          planId: plan.id,
          status: plan.price && plan.price.amount > 0 ? 'scheduled' : 'active',
          metadata: null as Record<string, string> | null,
          currentPeriodStartAt: null as Date | null,
          currentPeriodEndAt: null as Date | null,
        };
        subs.set(id, rec);
        return rec;
      },
      async activate(id, start, end) {
        const s = subs.get(id)!;
        s.status = 'active';
        s.currentPeriodStartAt = start;
        s.currentPeriodEndAt = end;
        return s;
      },
      async cancel(id) {
        const s = subs.get(id)!;
        s.status = 'canceled';
        return s;
      },
      async getById(id) {
        return subs.get(id);
      },
      async getActive(customerId, group) {
        return [...subs.values()].find(
          (s) => s.customerId === customerId && s.status === 'active' && group === 'base',
        );
      },
      async upgrade() {
        throw new Error('n/a');
      },
      async downgrade() {
        throw new Error('n/a');
      },
      async markPastDue(id) {
        const s = subs.get(id)!;
        s.status = 'past_due';
        return s;
      },
    },
    entitlement: {
      async createEntitlements() {},
      async check() {
        return { allowed: true, balance: {} };
      },
      async report() {
        return { success: true, balance: {} };
      },
      async removeBySubscription() {},
    },
    customer: {
      async create(data) {
        const id = `cust_${++custN}`;
        const c = { id, email: data.email, name: data.name, phone: data.phone };
        customers.set(id, c);
        return c;
      },
      async getById(id) {
        return customers.get(id);
      },
      async getByEmail(email) {
        return [...customers.values()].find((c) => c.email === email);
      },
      async getOrCreate(email, name) {
        const existing = [...customers.values()].find((c) => c.email === email);
        if (existing) return existing;
        return this.create({ email, name });
      },
      async delete() {},
    },
    invoice: {
      async create() {
        return {};
      },
      async getBySubscription() {
        return [];
      },
      async markPaid() {
        return {};
      },
    },
    billingCycle: {
      async run() {
        return { processed: 0, succeeded: 0, failed: 0, errors: [] };
      },
    },
    dunning: {
      async onPaymentFailure(subscriptionId) {
        const s = subs.get(subscriptionId);
        if (!s) throw new Error('missing');
        s.status = 'past_due';
        s.metadata = { dunning_stage: 'retrying', dunning_attempt: '1' };
        return s;
      },
      async onPaymentSuccess(subscriptionId) {
        const s = subs.get(subscriptionId);
        if (!s) return null;
        s.status = 'active';
        s.metadata = null;
        if (!s.currentPeriodStartAt) s.currentPeriodStartAt = new Date();
        if (!s.currentPeriodEndAt) {
          const end = new Date(s.currentPeriodStartAt);
          end.setUTCMonth(end.getUTCMonth() + 1);
          s.currentPeriodEndAt = end;
        }
        return s;
      },
      async processDue() {
        return 0;
      },
    },
  };

  return {
    id: 'billing',
    $Infer: { billing: billingData },
  };
}

describe('webhook → dunning + phone notify', () => {
  it('activates scheduled sub and emits customerPhone on payment.completed', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const notifyPlugin: BetterPayPlugin = {
      id: 'test-wa',
      notificationChannels: [{ id: 'test', send }],
    };

    const pay = betterPay({
      rateLimit: { enabled: false },
      plugins: [
        { id: 'mock-provider', providers: [mockProvider()] },
        createBillingPlugin(),
        notifyPlugin,
      ],
    });

    const customer = await pay.billing.createCustomer({
      email: 'user@test.com',
      name: 'User',
      phone: '081234567890',
    });

    const sub = await pay.billing.subscribe({
      customerId: customer.id,
      planId: 'pro',
    });
    expect(sub.status).toBe('scheduled');
    expect(sub.paymentUrl).toBeTruthy();

    const orderId = `bp_sub_${sub.subscriptionId}`;
    const wh = await pay.handleWebhook('mock', {
      body: JSON.stringify({
        order_id: orderId,
        event: 'payment.completed',
        event_id: 'evt_activate_1',
      }),
      headers: {},
    });
    expect(wh.success).toBe(true);

    const active = await pay.billing.getSubscription(customer.id, 'base');
    expect(active).toMatchObject({ status: 'active', id: sub.subscriptionId });

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'transaction.completed',
        customerEmail: 'user@test.com',
        customerPhone: '081234567890',
        payload: expect.objectContaining({
          orderId,
          subscriptionId: sub.subscriptionId,
        }),
      }),
    );
  });

  it('clears past_due dunning on renewal payment success', async () => {
    const pay = betterPay({
      rateLimit: { enabled: false },
      plugins: [
        { id: 'mock-provider', providers: [mockProvider()] },
        createBillingPlugin(),
      ],
    });

    const customer = await pay.billing.createCustomer({ email: 'r@test.com' });
    const sub = await pay.billing.subscribe({
      customerId: customer.id,
      planId: 'pro',
    });

    const billingData = pay.billing.services as BillingPluginData;
    expect(billingData.dunning).toBeDefined();
    await billingData.dunning!.onPaymentFailure(sub.subscriptionId);

    let row = (await billingData.subscription.getById?.(sub.subscriptionId)) as {
      status: string;
      metadata?: Record<string, string> | null;
    };
    expect(row?.status).toBe('past_due');

    const orderId = `bp_renew_${sub.subscriptionId}_test`;
    await pay.transactionService.create({
      orderId,
      providerId: 'mock',
      amount: 50_000,
      currency: 'IDR',
      customerEmail: customer.email,
      metadata: { subscriptionId: sub.subscriptionId, kind: 'renewal' },
    });
    await pay.transactionService.updateStatus(orderId, 'active', 'ext-r1');

    await pay.handleWebhook('mock', {
      body: JSON.stringify({
        order_id: orderId,
        event: 'payment.completed',
        event_id: 'evt_renew_ok',
      }),
      headers: {},
    });

    row = (await billingData.subscription.getById?.(sub.subscriptionId)) as typeof row;
    expect(row?.status).toBe('active');
    expect(row?.metadata?.dunning_stage).toBeUndefined();
  });
});
