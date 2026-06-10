import { describe, it, expect, beforeEach } from 'vitest';
import { SubscriptionService } from '../src/subscription/service';
import type { SubscriptionRecord, SubscriptionRepository, PlanDefinition } from '../src/types';
import { plan, feature } from '../src/schema';

function createMockSubRepo(): SubscriptionRepository & { records: Map<string, SubscriptionRecord> } {
  const records = new Map<string, SubscriptionRecord>();
  let idCounter = 0;

  return {
    records,

    async create(data) {
      const id = `sub_${++idCounter}`;
      const record: SubscriptionRecord = {
        id,
        customerId: data.customerId,
        planId: data.planId,
        group: data.group,
        status: data.status,
        cancelAtPeriodEnd: data.cancelAtPeriodEnd ?? false,
        currentPeriodStartAt: data.currentPeriodStartAt ?? null,
        currentPeriodEndAt: data.currentPeriodEndAt ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      records.set(id, record);
      return record;
    },

    async getById(id) {
      return records.get(id);
    },

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
      const record = records.get(id);
      if (!record) return undefined;
      Object.assign(record, data, { updatedAt: new Date() });
      return { ...record };
    },

    async cancel(id) {
      return this.update(id, { status: 'canceled' });
    },
  };
}

describe('SubscriptionService', () => {
  let repo: ReturnType<typeof createMockSubRepo>;
  let service: SubscriptionService;

  const freePlan: PlanDefinition = plan({
    id: 'free',
    group: 'base',
    default: true,
  });

  const proPlan: PlanDefinition = plan({
    id: 'pro',
    group: 'base',
    price: { amount: 199000, currency: 'IDR', interval: 'month' },
  });

  beforeEach(() => {
    repo = createMockSubRepo();
    service = new SubscriptionService(repo);
  });

  it('creates active subscription for free plan', async () => {
    const sub = await service.subscribe({
      customerId: 'cust_1',
      plan: freePlan,
    });
    expect(sub.status).toBe('active');
    expect(sub.planId).toBe('free');
  });

  it('creates scheduled subscription for paid plan', async () => {
    const sub = await service.subscribe({
      customerId: 'cust_1',
      plan: proPlan,
    });
    expect(sub.status).toBe('scheduled');
    expect(sub.planId).toBe('pro');
  });

  it('rejects duplicate active subscription in same group', async () => {
    await service.subscribe({ customerId: 'cust_1', plan: freePlan });
    await expect(
      service.subscribe({ customerId: 'cust_1', plan: proPlan }),
    ).rejects.toThrow('already has an active subscription');
  });

  it('activates a scheduled subscription', async () => {
    const sub = await service.subscribe({ customerId: 'cust_1', plan: proPlan });
    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 86400000);
    const activated = await service.activate(sub.id, now, periodEnd);
    expect(activated.status).toBe('active');
  });

  it('cancels a subscription immediately', async () => {
    const sub = await service.subscribe({ customerId: 'cust_1', plan: freePlan });
    const canceled = await service.cancel(sub.id);
    expect(canceled.status).toBe('canceled');
  });

  it('cancels at period end', async () => {
    const sub = await service.subscribe({ customerId: 'cust_1', plan: freePlan });
    const updated = await service.cancel(sub.id, true);
    expect(updated.cancelAtPeriodEnd).toBe(true);
    expect(updated.status).toBe('active'); // Still active
  });

  it('upgrades: ends current, creates new active', async () => {
    const freeSub = await service.subscribe({ customerId: 'cust_1', plan: freePlan });
    // Manually end the free sub first so we can create pro
    await service.cancel(freeSub.id);

    const proSub = await service.subscribe({ customerId: 'cust_1', plan: proPlan });
    const now = new Date();
    const activated = await service.activate(proSub.id, now, new Date(now.getTime() + 30 * 86400000));

    // Upgrade from pro to enterprise
    const enterprisePlan: PlanDefinition = plan({
      id: 'enterprise',
      group: 'base',
      price: { amount: 999000, currency: 'IDR', interval: 'month' },
    });

    const upgraded = await service.upgrade({
      currentSubscriptionId: activated.id,
      newPlan: enterprisePlan,
    });

    expect(upgraded.status).toBe('active');
    expect(upgraded.planId).toBe('enterprise');
    expect(repo.records.get(activated.id)!.status).toBe('ended');
  });

  it('downgrade: marks cancel at period end + creates scheduled', async () => {
    const sub = await service.subscribe({ customerId: 'cust_1', plan: freePlan });
    const result = await service.downgrade({
      currentSubscriptionId: sub.id,
      newPlan: freePlan, // downgrade to free
    });

    expect(result.current.cancelAtPeriodEnd).toBe(true);
    expect(result.scheduled.status).toBe('scheduled');
    expect(result.scheduled.planId).toBe('free');
  });

  it('marks subscription as past_due', async () => {
    const sub = await service.subscribe({ customerId: 'cust_1', plan: freePlan });
    const pastDue = await service.markPastDue(sub.id);
    expect(pastDue.status).toBe('past_due');
  });

  it('rejects invalid transitions', async () => {
    const sub = await service.subscribe({ customerId: 'cust_1', plan: freePlan });
    await service.cancel(sub.id);
    // canceled is terminal
    await expect(service.activate(sub.id, new Date(), new Date())).rejects.toThrow(
      'Invalid subscription transition',
    );
  });
});
