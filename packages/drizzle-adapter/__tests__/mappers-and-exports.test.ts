import { describe, it, expect } from 'vitest';
import {
  createDrizzleRepositories,
  createMapWebhookEventRepo,
  toSubscriptionRecord,
} from '../src/index';

describe('drizzle-adapter exports', () => {
  it('createDrizzleRepositories exposes transaction, webhookEvent, and billing repos', () => {
    const fakeDb = {};
    const repos = createDrizzleRepositories(fakeDb);
    expect(repos.transaction).toBeDefined();
    expect(repos.webhookEvent).toBeDefined();
    expect(repos.subscription).toBeDefined();
    expect(repos.entitlement).toBeDefined();
    expect(repos.customer).toBeDefined();
    expect(repos.invoice).toBeDefined();
    expect(typeof repos.webhookEvent.tryRecord).toBe('function');
  });

  it('toSubscriptionRecord maps groupId → group for billing contracts', () => {
    const record = toSubscriptionRecord({
      id: 'sub_1',
      customerId: 'c1',
      planId: 'pro',
      groupId: 'base',
      status: 'active',
      cancelAtPeriodEnd: false,
      currentPeriodStartAt: null,
      currentPeriodEndAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    expect(record.group).toBe('base');
    expect((record as { groupId?: string }).groupId).toBeUndefined();
  });

  it('map webhook event repo dedupes by eventKey (durable-store contract)', async () => {
    const store = createMapWebhookEventRepo();
    const input = {
      eventKey: 'midtrans:evt_1',
      providerId: 'midtrans',
      providerEventId: 'evt_1',
      eventName: 'payment.completed',
    };
    const first = await store.tryRecord(input);
    const second = await store.tryRecord(input);
    expect(first.wasDuplicate).toBe(false);
    expect(second.wasDuplicate).toBe(true);
    expect(store.keys.size).toBe(1);
  });

  it('map webhook event repo release allows re-claim after failed apply', async () => {
    const store = createMapWebhookEventRepo();
    const input = {
      eventKey: 'midtrans:evt_retry',
      providerId: 'midtrans',
      providerEventId: 'evt_retry',
    };
    await store.tryRecord(input);
    await store.release(input.eventKey);
    const again = await store.tryRecord(input);
    expect(again.wasDuplicate).toBe(false);
  });
});
