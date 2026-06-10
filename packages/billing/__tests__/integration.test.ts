// ── Full billing integration test ─────────────────────────────────────────
// Tests: feature → plan → customer → subscribe → entitlements → check → report

import { describe, it, expect, beforeEach } from 'vitest';
import { feature, plan } from '../src/schema';
import { normalizeSchema } from '../src/normalize';
import { SubscriptionService } from '../src/subscription/service';
import { EntitlementService } from '../src/entitlement/service';
import { CustomerService } from '../src/customer/service';
import type {
  SubscriptionRecord,
  SubscriptionRepository,
  EntitlementRecord,
  EntitlementRepository,
  CustomerRecord,
  CustomerRepository,
} from '../src/types';
import { computeNextResetAt } from '../src/entitlement/service';

// ── In-memory repos ─────────────────────────────────────────────────────

function createSubRepo(): SubscriptionRepository & { records: Map<string, SubscriptionRecord> } {
  const records = new Map<string, SubscriptionRecord>();
  let id = 0;
  return {
    records,
    async create(data) {
      const r: SubscriptionRecord = {
        id: `sub_${++id}`, customerId: data.customerId, planId: data.planId,
        group: data.group, status: data.status, cancelAtPeriodEnd: data.cancelAtPeriodEnd ?? false,
        currentPeriodStartAt: data.currentPeriodStartAt ?? null,
        currentPeriodEndAt: data.currentPeriodEndAt ?? null,
        createdAt: new Date(), updatedAt: new Date(),
      };
      records.set(r.id, r);
      return r;
    },
    async getById(id) { return records.get(id); },
    async getActiveByCustomerAndGroup(cid, group) {
      return Array.from(records.values()).find(
        (r) => r.customerId === cid && r.group === group && r.status === 'active',
      );
    },
    async getScheduledByCustomerAndGroup(cid, group) {
      return Array.from(records.values()).filter(
        (r) => r.customerId === cid && r.group === group && r.status === 'scheduled',
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

function createEntRepo(): EntitlementRepository & { records: Map<string, EntitlementRecord> } {
  const records = new Map<string, EntitlementRecord>();
  let id = 0;
  return {
    records,
    async create(data) {
      const r: EntitlementRecord = {
        id: `ent_${++id}`, customerId: data.customerId, featureId: data.featureId,
        subscriptionId: data.subscriptionId, limit: data.limit, used: data.used,
        nextResetAt: data.nextResetAt, createdAt: new Date(), updatedAt: new Date(),
      };
      records.set(r.id, r);
      return r;
    },
    async getByCustomerAndFeature(cid, fid) {
      return Array.from(records.values()).filter(
        (r) => r.customerId === cid && r.featureId === fid,
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

function createCustRepo(): CustomerRepository & { records: Map<string, CustomerRecord> } {
  const records = new Map<string, CustomerRecord>();
  let id = 0;
  return {
    records,
    async create(data) {
      const r: CustomerRecord = {
        id: `cust_${++id}`, email: data.email, name: data.name,
        phone: data.phone, metadata: data.metadata, createdAt: new Date(), updatedAt: new Date(),
      };
      records.set(r.id, r);
      return r;
    },
    async getById(id) { return records.get(id); },
    async getByEmail(email) {
      return Array.from(records.values()).find((r) => r.email === email);
    },
    async update(id, data) {
      const r = records.get(id);
      if (!r) return undefined;
      Object.assign(r, data, { updatedAt: new Date() });
      return { ...r };
    },
    async delete(id) { records.delete(id); },
    async list(limit, offset) {
      return Array.from(records.values()).slice(offset, offset + limit);
    },
  };
}

describe('Billing Integration: Full Flow', () => {
  // Define plans
  const messages = feature({ id: 'messages', type: 'metered' });
  const aiModels = feature({ id: 'ai-models', type: 'boolean' });

  const freePlan = plan({
    id: 'free',
    group: 'base',
    default: true,
    includes: [messages({ limit: 100, reset: 'month' })],
  });

  const proPlan = plan({
    id: 'pro',
    group: 'base',
    price: { amount: 199000, currency: 'IDR', interval: 'month' },
    includes: [
      messages({ limit: 5000, reset: 'month' }),
      aiModels(),
    ],
  });

  const schema = normalizeSchema([freePlan, proPlan]);

  let subRepo: ReturnType<typeof createSubRepo>;
  let entRepo: ReturnType<typeof createEntRepo>;
  let custRepo: ReturnType<typeof createCustRepo>;
  let subService: SubscriptionService;
  let entService: EntitlementService;
  let custService: CustomerService;

  beforeEach(() => {
    subRepo = createSubRepo();
    entRepo = createEntRepo();
    custRepo = createCustRepo();
    subService = new SubscriptionService(subRepo);
    entService = new EntitlementService(entRepo);
    custService = new CustomerService(custRepo);
  });

  it('complete flow: customer → free sub → check → report → upgrade → entitlements', async () => {
    // 1. Create customer
    const customer = await custService.create({ email: 'budi@example.com', name: 'Budi' });
    expect(customer.id).toMatch(/^cust_/);

    // 2. Subscribe to free plan
    const freeSub = await subService.subscribe({
      customerId: customer.id,
      plan: freePlan,
    });
    expect(freeSub.status).toBe('active');

    // 3. Create entitlements for free plan
    await entService.createEntitlements(customer.id, freeSub.id, freePlan.includes);

    // 4. Check entitlement: messages (metered, limit 100)
    const checkResult = await entService.check(customer.id, 'messages');
    expect(checkResult.allowed).toBe(true);
    expect(checkResult.balance.remaining).toBe(100);

    // 5. Report usage: 10 messages
    const reportResult = await entService.report(customer.id, 'messages', 10);
    expect(reportResult.success).toBe(true);
    expect(reportResult.balance.remaining).toBe(90);

    // 6. Check AI models (boolean = unlimited)
    const aiCheck = await entService.check(customer.id, 'ai-models');
    expect(aiCheck.allowed).toBe(false); // No entitlement for free plan

    // 7. Upgrade to Pro
    await subService.cancel(freeSub.id); // Cancel free first
    await entService.removeBySubscription(freeSub.id);

    const proSub = await subService.subscribe({
      customerId: customer.id,
      plan: proPlan,
    });

    // Simulate payment confirmation → activate
    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 86400000);
    await subService.activate(proSub.id, now, periodEnd);

    // Create Pro entitlements
    await entService.createEntitlements(customer.id, proSub.id, proPlan.includes);

    // 8. Check Pro entitlements
    const proMsgCheck = await entService.check(customer.id, 'messages');
    expect(proMsgCheck.allowed).toBe(true);
    expect(proMsgCheck.balance.remaining).toBe(5000);

    const proAiCheck = await entService.check(customer.id, 'ai-models');
    expect(proAiCheck.allowed).toBe(true); // Now has access!
    expect(proAiCheck.balance.unlimited).toBe(true);

    // 9. Report usage on Pro plan
    const proReport = await entService.report(customer.id, 'messages', 50);
    expect(proReport.success).toBe(true);
    expect(proReport.balance.remaining).toBe(4950);
  });

  it('schema normalization works with plans', () => {
    expect(schema.plans).toHaveLength(2);
    expect(schema.planMap.get('free')!.isDefault).toBe(true);
    expect(schema.planMap.get('pro')!.priceAmount).toBe(199000);
    expect(schema.planMap.get('pro')!.hash).toHaveLength(16);
  });

  it('prevents double active subscription in same group', async () => {
    const customer = await custService.create({ email: 'test@test.com' });
    await subService.subscribe({ customerId: customer.id, plan: freePlan });

    await expect(
      subService.subscribe({ customerId: customer.id, plan: proPlan }),
    ).rejects.toThrow('already has an active subscription');
  });

  it('canceled subscription revokes entitlements', async () => {
    const customer = await custService.create({ email: 'test@test.com' });
    const sub = await subService.subscribe({ customerId: customer.id, plan: freePlan });
    await entService.createEntitlements(customer.id, sub.id, freePlan.includes);

    // Verify entitlement exists
    const check = await entService.check(customer.id, 'messages');
    expect(check.allowed).toBe(true);

    // Cancel + remove entitlements
    await subService.cancel(sub.id);
    await entService.removeBySubscription(sub.id);

    const checkAfter = await entService.check(customer.id, 'messages');
    expect(checkAfter.allowed).toBe(false);
  });
});
