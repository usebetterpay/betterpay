import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BillingCycleRunner } from '../src/billing-cycle/runner';
import { SubscriptionService } from '../src/subscription/service';
import { InvoiceService } from '../src/invoice/service';
import { EntitlementService } from '../src/entitlement/service';
import { plan, feature } from '../src/schema';
import type {
  SubscriptionRecord,
  SubscriptionRepository,
  InvoiceRecord,
  InvoiceRepository,
  InvoiceStatus,
  EntitlementRecord,
  EntitlementRepository,
} from '../src/types';
import { computeNextResetAt } from '../src/entitlement/service';

// ── Mock repos (shared with other tests, minimal) ─────────────────────────

function createSubRepo(): SubscriptionRepository & { records: Map<string, SubscriptionRecord> } {
  const records = new Map<string, SubscriptionRecord>();
  let idCounter = 0;
  return {
    records,
    async create(data) {
      const id = `sub_${++idCounter}`;
      const r: SubscriptionRecord = {
        id, customerId: data.customerId, planId: data.planId, group: data.group,
        status: data.status, cancelAtPeriodEnd: data.cancelAtPeriodEnd ?? false,
        currentPeriodStartAt: data.currentPeriodStartAt ?? null,
        currentPeriodEndAt: data.currentPeriodEndAt ?? null,
        createdAt: new Date(), updatedAt: new Date(),
      };
      records.set(id, r);
      return r;
    },
    async getById(id) { return records.get(id); },
    async getActiveByCustomerAndGroup(customerId, group) {
      return Array.from(records.values()).find(
        (r) => r.customerId === customerId && r.group === group && r.status === 'active',
      );
    },
    async getScheduledByCustomerAndGroup(customerId, group) {
      return Array.from(records.values()).filter(
        (r) => r.customerId === customerId && r.group === group && r.status === 'scheduled',
      );
    },
    async update(id, data) {
      const r = records.get(id);
      if (!r) return undefined;
      Object.assign(r, data, { updatedAt: new Date() });
      return { ...r };
    },
    async cancel(id) { return this.update(id, { status: 'canceled' }); },
  };
}

function createInvoiceRepo(): InvoiceRepository & { records: Map<string, InvoiceRecord> } {
  const records = new Map<string, InvoiceRecord>();
  let idCounter = 0;
  return {
    records,
    async create(data) {
      const id = `inv_${++idCounter}`;
      const r: InvoiceRecord = {
        id, customerId: data.customerId, subscriptionId: data.subscriptionId,
        planId: data.planId, amount: data.amount, currency: data.currency,
        status: 'open', dueAt: data.dueAt, paidAt: null,
        createdAt: new Date(), updatedAt: new Date(),
      };
      records.set(id, r);
      return r;
    },
    async getById(id) { return records.get(id); },
    async getBySubscription(subId) {
      return Array.from(records.values()).filter((r) => r.subscriptionId === subId);
    },
    async updateStatus(id, status, paidAt?) {
      const r = records.get(id);
      if (!r) return undefined;
      r.status = status;
      if (paidAt) r.paidAt = paidAt;
      r.updatedAt = new Date();
      return { ...r };
    },
    async getOverdue(now) {
      return Array.from(records.values()).filter(
        (r) => r.status === 'open' && r.dueAt < now,
      );
    },
  };
}

function createEntitlementRepo(): EntitlementRepository & { records: Map<string, EntitlementRecord> } {
  const records = new Map<string, EntitlementRecord>();
  let idCounter = 0;
  return {
    records,
    async create(data) {
      const id = `ent_${++idCounter}`;
      const r: EntitlementRecord = {
        id, customerId: data.customerId, featureId: data.featureId,
        subscriptionId: data.subscriptionId, limit: data.limit, used: data.used,
        nextResetAt: data.nextResetAt, createdAt: new Date(), updatedAt: new Date(),
      };
      records.set(id, r);
      return r;
    },
    async getByCustomerAndFeature(customerId, featureId) {
      return Array.from(records.values()).filter(
        (r) => r.customerId === customerId && r.featureId === featureId,
      );
    },
    async deduct(id, amount) {
      const r = records.get(id);
      if (!r) return undefined;
      r.used += amount;
      return { ...r };
    },
    async resetIfNeeded(id, now) {
      const r = records.get(id);
      if (!r) return undefined;
      if (!r.nextResetAt || r.nextResetAt > now) return r;
      r.used = 0;
      r.nextResetAt = computeNextResetAt('month', now);
      return { ...r };
    },
    async deleteBySubscription(subId) {
      for (const [id, r] of records) {
        if (r.subscriptionId === subId) records.delete(id);
      }
    },
  };
}

describe('BillingCycleRunner', () => {
  const messages = feature({ id: 'messages', type: 'metered' });
  const proPlanDef = plan({
    id: 'pro',
    group: 'base',
    price: { amount: 199000, currency: 'IDR', interval: 'month' },
    includes: [messages({ limit: 5000, reset: 'month' })],
  });

  let subRepo: ReturnType<typeof createSubRepo>;
  let invRepo: ReturnType<typeof createInvoiceRepo>;
  let entRepo: ReturnType<typeof createEntitlementRepo>;
  let subService: SubscriptionService;
  let invService: InvoiceService;
  let entService: EntitlementService;

  beforeEach(() => {
    subRepo = createSubRepo();
    invRepo = createInvoiceRepo();
    entRepo = createEntitlementRepo();
    subService = new SubscriptionService(subRepo);
    invService = new InvoiceService(invRepo);
    entService = new EntitlementService(entRepo);
  });

  it('processes due subscriptions and creates invoices', async () => {
    // Create an active subscription past its period
    const pastDate = new Date(Date.now() - 86400000);
    const sub = await subRepo.create({
      customerId: 'cust_1',
      planId: 'pro',
      group: 'base',
      status: 'active',
      currentPeriodStartAt: new Date(Date.now() - 30 * 86400000),
      currentPeriodEndAt: pastDate,
    });

    const runner = new BillingCycleRunner({
      subscriptionService: subService,
      updateSubscriptionPeriod: async (id, start, end) => {
        await subRepo.update(id, { currentPeriodStartAt: start, currentPeriodEndAt: end });
      },
      invoiceService: invService,
      entitlementService: entService,
      planMap: new Map([['pro', proPlanDef]]),
      findDueSubscriptions: async (before: Date) =>
        Array.from(subRepo.records.values()).filter(
          (s) => s.status === 'active' && s.currentPeriodEndAt && s.currentPeriodEndAt < before,
        ),
      createPaymentForSubscription: vi.fn().mockResolvedValue({
        paymentUrl: 'https://pay.test/abc',
        providerTransactionId: 'prov_123',
      }),
    });

    const result = await runner.run();

    expect(result.processed).toBe(1);
    expect(result.succeeded).toBe(1);
    expect(result.failed).toBe(0);
    expect(invRepo.records.size).toBe(1); // Invoice created
  });

  it('ends subscriptions marked for cancel at period end', async () => {
    const pastDate = new Date(Date.now() - 86400000);
    const sub = await subRepo.create({
      customerId: 'cust_1',
      planId: 'pro',
      group: 'base',
      status: 'active',
      cancelAtPeriodEnd: true,
      currentPeriodEndAt: pastDate,
    });

    const runner = new BillingCycleRunner({
      subscriptionService: subService,
      updateSubscriptionPeriod: async (id, start, end) => {
        await subRepo.update(id, { currentPeriodStartAt: start, currentPeriodEndAt: end });
      },
      invoiceService: invService,
      entitlementService: entService,
      planMap: new Map([['pro', proPlanDef]]),
      findDueSubscriptions: async (before: Date) =>
        Array.from(subRepo.records.values()).filter(
          (s) => s.currentPeriodEndAt && s.currentPeriodEndAt < before,
        ),
      createPaymentForSubscription: vi.fn(),
    });

    const result = await runner.run();
    expect(result.succeeded).toBe(1);
    expect(subRepo.records.get(sub.id)!.status).toBe('ended');
  });

  it('handles errors gracefully', async () => {
    await subRepo.create({
      customerId: 'cust_1',
      planId: 'nonexistent-plan',
      group: 'base',
      status: 'active',
      currentPeriodEndAt: new Date(Date.now() - 86400000),
    });

    const runner = new BillingCycleRunner({
      subscriptionService: subService,
      updateSubscriptionPeriod: async (id, start, end) => {
        await subRepo.update(id, { currentPeriodStartAt: start, currentPeriodEndAt: end });
      },
      invoiceService: invService,
      entitlementService: entService,
      planMap: new Map(), // No plans registered
      findDueSubscriptions: async () => Array.from(subRepo.records.values()),
      createPaymentForSubscription: vi.fn(),
    });

    const result = await runner.run();
    expect(result.processed).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.errors[0]!.error).toContain('Plan not found');
  });
});
