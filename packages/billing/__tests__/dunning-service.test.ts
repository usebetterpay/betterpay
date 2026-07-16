import { describe, it, expect } from 'vitest';
import { DunningService } from '../src/dunning/dunning-service';
import { createInMemorySubscriptionRepo } from '../src/in-memory-repos';

describe('DunningService', () => {
  it('marks past_due and schedules retry on first failure', async () => {
    const repo = createInMemorySubscriptionRepo();
    const sub = await repo.create({
      customerId: 'c1',
      planId: 'pro',
      group: 'base',
      status: 'active',
      currentPeriodStartAt: new Date('2020-01-01'),
      currentPeriodEndAt: new Date('2020-02-01'),
    });

    const dunning = new DunningService(repo, {
      maxRetryAttempts: 2,
      retryIntervalDays: 3,
      gracePeriodDays: 7,
    });

    const t0 = new Date('2020-02-05T00:00:00.000Z');
    const updated = await dunning.onPaymentFailure(sub.id, t0);

    expect(updated.status).toBe('past_due');
    expect(updated.metadata?.dunning_stage).toBe('retrying');
    expect(updated.metadata?.dunning_attempt).toBe('1');
    expect(updated.metadata?.dunning_next_retry_at).toBe(
      new Date('2020-02-08T00:00:00.000Z').toISOString(),
    );
  });

  it('suspends after max retries, then expires after grace', async () => {
    const repo = createInMemorySubscriptionRepo();
    const sub = await repo.create({
      customerId: 'c1',
      planId: 'pro',
      group: 'base',
      status: 'active',
    });

    const dunning = new DunningService(repo, {
      maxRetryAttempts: 2,
      retryIntervalDays: 1,
      gracePeriodDays: 2,
    });

    const t0 = new Date('2020-03-01T00:00:00.000Z');
    await dunning.onPaymentFailure(sub.id, t0); // attempt 1
    await dunning.onPaymentFailure(sub.id, new Date('2020-03-02T00:00:00.000Z')); // attempt 2 still retrying

    const suspended = await dunning.onPaymentFailure(
      sub.id,
      new Date('2020-03-03T00:00:00.000Z'),
    ); // attempt 3 → suspend
    expect(suspended.status).toBe('past_due');
    expect(suspended.metadata?.dunning_stage).toBe('suspended');
    expect(suspended.metadata?.dunning_expires_at).toBe(
      new Date('2020-03-05T00:00:00.000Z').toISOString(),
    );

    // before grace ends — no-op
    const still = await dunning.onPaymentFailure(
      sub.id,
      new Date('2020-03-04T00:00:00.000Z'),
    );
    expect(still.metadata?.dunning_stage).toBe('suspended');
    expect(still.status).toBe('past_due');

    const expired = await dunning.onPaymentFailure(
      sub.id,
      new Date('2020-03-05T00:00:00.000Z'),
    );
    expect(expired.status).toBe('ended');
    expect(expired.metadata?.dunning_stage).toBe('expired');
  });

  it('processDue advances retrying subs when next_retry elapsed', async () => {
    const repo = createInMemorySubscriptionRepo();
    const sub = await repo.create({
      customerId: 'c1',
      planId: 'pro',
      group: 'base',
      status: 'active',
    });

    const dunning = new DunningService(repo, {
      maxRetryAttempts: 1,
      retryIntervalDays: 1,
      gracePeriodDays: 1,
    });

    await dunning.onPaymentFailure(sub.id, new Date('2020-04-01T00:00:00.000Z'));

    // too early
    expect(await dunning.processDue(new Date('2020-04-01T12:00:00.000Z'))).toBe(0);

    // next retry due → second failure → suspend (max 1)
    const n = await dunning.processDue(new Date('2020-04-02T00:00:00.000Z'));
    expect(n).toBe(1);

    const after = await repo.getById(sub.id);
    expect(after?.metadata?.dunning_stage).toBe('suspended');
  });

  it('onPaymentSuccess clears dunning and reactivates past_due', async () => {
    const repo = createInMemorySubscriptionRepo();
    const sub = await repo.create({
      customerId: 'c1',
      planId: 'pro',
      group: 'base',
      status: 'active',
    });

    const dunning = new DunningService(repo);
    await dunning.onPaymentFailure(sub.id, new Date());

    const ok = await dunning.onPaymentSuccess(sub.id);
    expect(ok?.status).toBe('active');
    expect(ok?.metadata?.dunning_stage).toBeUndefined();
    expect(ok?.metadata?.dunning_attempt).toBeUndefined();
  });

  it('onPaymentSuccess activates scheduled subscription after first payment', async () => {
    const repo = createInMemorySubscriptionRepo();
    const sub = await repo.create({
      customerId: 'c1',
      planId: 'pro',
      group: 'base',
      status: 'scheduled',
    });

    const dunning = new DunningService(repo);
    const ok = await dunning.onPaymentSuccess(sub.id);
    expect(ok?.status).toBe('active');
    expect(ok?.currentPeriodStartAt).toBeTruthy();
    expect(ok?.currentPeriodEndAt).toBeTruthy();
  });
});
