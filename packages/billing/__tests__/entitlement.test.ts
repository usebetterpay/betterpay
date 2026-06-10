import { describe, it, expect, beforeEach } from 'vitest';
import { EntitlementService, computeNextResetAt } from '../src/entitlement/service';
import type { EntitlementRecord, EntitlementRepository, FeatureInclude } from '../src/types';

function createMockEntitlementRepo(): EntitlementRepository & { records: Map<string, EntitlementRecord> } {
  const records = new Map<string, EntitlementRecord>();
  let idCounter = 0;

  return {
    records,

    async create(data) {
      const id = `ent_${++idCounter}`;
      const record: EntitlementRecord = {
        id,
        customerId: data.customerId,
        featureId: data.featureId,
        subscriptionId: data.subscriptionId,
        limit: data.limit,
        used: data.used,
        nextResetAt: data.nextResetAt,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      records.set(id, record);
      return record;
    },

    async getByCustomerAndFeature(customerId, featureId) {
      return Array.from(records.values()).filter(
        (r) => r.customerId === customerId && r.featureId === featureId,
      );
    },

    async deduct(id, amount) {
      const record = records.get(id);
      if (!record) return undefined;
      record.used += amount;
      record.updatedAt = new Date();
      return { ...record };
    },

    async resetIfNeeded(id, now) {
      const record = records.get(id);
      if (!record) return undefined;
      if (!record.nextResetAt || record.nextResetAt > now) return record;
      record.used = 0;
      record.nextResetAt = computeNextResetAt('month', now);
      record.updatedAt = new Date();
      return { ...record };
    },

    async deleteBySubscription(subscriptionId) {
      for (const [id, record] of records) {
        if (record.subscriptionId === subscriptionId) {
          records.delete(id);
        }
      }
    },
  };
}

describe('EntitlementService', () => {
  let repo: ReturnType<typeof createMockEntitlementRepo>;
  let service: EntitlementService;

  beforeEach(() => {
    repo = createMockEntitlementRepo();
    service = new EntitlementService(repo);
  });

  it('check returns allowed=false when no entitlements', async () => {
    const result = await service.check('cust_1', 'messages');
    expect(result.allowed).toBe(false);
    expect(result.balance.remaining).toBe(0);
  });

  it('check returns allowed=true for boolean (unlimited) feature', async () => {
    await repo.create({
      customerId: 'cust_1',
      featureId: 'ai-models',
      subscriptionId: 'sub_1',
      limit: null,
      used: 0,
      nextResetAt: null,
    });

    const result = await service.check('cust_1', 'ai-models');
    expect(result.allowed).toBe(true);
    expect(result.balance.unlimited).toBe(true);
    expect(result.balance.limit).toBeNull();
  });

  it('check returns remaining balance for metered feature', async () => {
    await repo.create({
      customerId: 'cust_1',
      featureId: 'messages',
      subscriptionId: 'sub_1',
      limit: 5000,
      used: 1200,
      nextResetAt: new Date(Date.now() + 86400000 * 30),
    });

    const result = await service.check('cust_1', 'messages');
    expect(result.allowed).toBe(true);
    expect(result.balance.remaining).toBe(3800);
    expect(result.balance.limit).toBe(5000);
  });

  it('report deducts usage successfully', async () => {
    await repo.create({
      customerId: 'cust_1',
      featureId: 'messages',
      subscriptionId: 'sub_1',
      limit: 5000,
      used: 0,
      nextResetAt: new Date(Date.now() + 86400000 * 30),
    });

    const result = await service.report('cust_1', 'messages', 10);
    expect(result.success).toBe(true);
    expect(result.balance.remaining).toBe(4990);
  });

  it('report fails when insufficient balance', async () => {
    await repo.create({
      customerId: 'cust_1',
      featureId: 'messages',
      subscriptionId: 'sub_1',
      limit: 100,
      used: 95,
      nextResetAt: new Date(Date.now() + 86400000 * 30),
    });

    const result = await service.report('cust_1', 'messages', 10);
    expect(result.success).toBe(false);
  });

  it('report resets stale entitlements before deducting', async () => {
    const pastDate = new Date(Date.now() - 86400000); // yesterday
    await repo.create({
      customerId: 'cust_1',
      featureId: 'messages',
      subscriptionId: 'sub_1',
      limit: 5000,
      used: 4999, // almost exhausted
      nextResetAt: pastDate, // should trigger lazy reset
    });

    const result = await service.report('cust_1', 'messages', 10);
    expect(result.success).toBe(true);
    expect(result.balance.remaining).toBe(4990); // reset then deducted
  });

  it('createEntitlements creates records from plan features', async () => {
    const features: FeatureInclude[] = [
      { featureId: 'ai-models', type: 'boolean' },
      { featureId: 'messages', type: 'metered', metered: { limit: 5000, reset: 'month' } },
    ];

    await service.createEntitlements('cust_1', 'sub_1', features);
    expect(repo.records.size).toBe(2);

    const aiModelsEnt = Array.from(repo.records.values()).find(
      (r) => r.featureId === 'ai-models',
    );
    expect(aiModelsEnt?.limit).toBeNull(); // unlimited

    const messagesEnt = Array.from(repo.records.values()).find(
      (r) => r.featureId === 'messages',
    );
    expect(messagesEnt?.limit).toBe(5000);
    expect(messagesEnt?.nextResetAt).toBeInstanceOf(Date);
  });

  it('removeBySubscription deletes all entitlements', async () => {
    await service.createEntitlements('cust_1', 'sub_1', [
      { featureId: 'a', type: 'boolean' },
      { featureId: 'b', type: 'boolean' },
    ]);
    expect(repo.records.size).toBe(2);

    await service.removeBySubscription('sub_1');
    expect(repo.records.size).toBe(0);
  });

  it('rejects non-positive report amount', async () => {
    await expect(service.report('cust_1', 'messages', 0)).rejects.toThrow();
    await expect(service.report('cust_1', 'messages', -1)).rejects.toThrow();
  });
});

describe('computeNextResetAt', () => {
  it('adds 1 day', () => {
    const from = new Date('2026-01-15T00:00:00Z');
    const next = computeNextResetAt('day', from);
    expect(next.getDate()).toBe(16);
  });

  it('adds 7 days for week', () => {
    const from = new Date('2026-01-15T00:00:00Z');
    const next = computeNextResetAt('week', from);
    expect(next.getDate()).toBe(22);
  });

  it('adds 1 month', () => {
    const from = new Date('2026-01-15T00:00:00Z');
    const next = computeNextResetAt('month', from);
    expect(next.getMonth()).toBe(1); // February
  });

  it('adds 1 year', () => {
    const from = new Date('2026-06-15T00:00:00Z');
    const next = computeNextResetAt('year', from);
    expect(next.getFullYear()).toBe(2027);
  });
});
