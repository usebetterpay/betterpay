// ── Multi-stage dunning (persisted on subscription.metadata) ─────────────
// Stages: retrying → suspended → expired (status: past_due → ended)

import type { SubscriptionRecord } from '../types';
import type { SubscriptionRepository } from '../subscription/service';
import type { DunningConfig, DunningStage } from './dunning-manager';
import { DEFAULT_DUNNING_CONFIG } from './dunning-manager';

const META = {
  stage: 'dunning_stage',
  attempt: 'dunning_attempt',
  nextRetryAt: 'dunning_next_retry_at',
  lastFailedAt: 'dunning_last_failed_at',
  suspendedAt: 'dunning_suspended_at',
  expiresAt: 'dunning_expires_at',
} as const;

export type { DunningStage };

export interface DunningCallbacks {
  onRetry?: (subscription: SubscriptionRecord) => Promise<void>;
  onSuspend?: (subscription: SubscriptionRecord) => Promise<void>;
  onExpire?: (subscription: SubscriptionRecord) => Promise<void>;
}

function metaString(meta: Record<string, string>, key: string): string | undefined {
  const v = meta[key];
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

function readStage(meta: Record<string, string>): DunningStage | undefined {
  const s = metaString(meta, META.stage);
  if (s === 'active' || s === 'retrying' || s === 'suspended' || s === 'expired') return s;
  return undefined;
}

/**
 * Multi-stage dunning persisted on subscription.metadata.
 * Subscription status stays within the domain machine:
 * - retrying / suspended → past_due
 * - expired → ended
 */
export class DunningService {
  private readonly config: DunningConfig;
  private readonly callbacks: DunningCallbacks;

  constructor(
    private readonly subscriptions: SubscriptionRepository,
    config?: Partial<DunningConfig>,
    callbacks?: DunningCallbacks,
  ) {
    this.config = { ...DEFAULT_DUNNING_CONFIG, ...config };
    this.callbacks = callbacks ?? {};
  }

  async onPaymentFailure(
    subscriptionId: string,
    now: Date = new Date(),
  ): Promise<SubscriptionRecord> {
    const sub = await this.subscriptions.getById(subscriptionId);
    if (!sub) {
      throw new Error(`Subscription not found: ${subscriptionId}`);
    }

    if (sub.status === 'ended' || sub.status === 'canceled') {
      return sub;
    }

    const meta: Record<string, string> = { ...(sub.metadata ?? {}) };
    const stage = readStage(meta);

    // Suspended past grace → expire
    if (stage === 'suspended') {
      const expiresRaw = metaString(meta, META.expiresAt);
      if (expiresRaw && new Date(expiresRaw) <= now) {
        return this.expire(sub, meta, now);
      }
      return sub;
    }

    if (stage === 'expired') {
      return sub;
    }

    const prevAttempt = Number(meta[META.attempt] ?? 0);
    const attempt = prevAttempt + 1;
    meta[META.attempt] = String(attempt);
    meta[META.lastFailedAt] = now.toISOString();

    if (attempt <= this.config.maxRetryAttempts) {
      const next = new Date(now);
      next.setUTCDate(next.getUTCDate() + this.config.retryIntervalDays);
      meta[META.stage] = 'retrying';
      meta[META.nextRetryAt] = next.toISOString();
      delete meta[META.suspendedAt];
      delete meta[META.expiresAt];

      const updated = await this.ensurePastDue(sub, meta, now);
      await this.callbacks.onRetry?.(updated);
      return updated;
    }

    // Max retries → suspend with grace period
    const expiresAt = new Date(now);
    expiresAt.setUTCDate(expiresAt.getUTCDate() + this.config.gracePeriodDays);
    meta[META.stage] = 'suspended';
    meta[META.suspendedAt] = now.toISOString();
    meta[META.expiresAt] = expiresAt.toISOString();
    delete meta[META.nextRetryAt];

    const updated = await this.ensurePastDue(sub, meta, now);
    await this.callbacks.onSuspend?.(updated);
    return updated;
  }

  async onPaymentSuccess(subscriptionId: string): Promise<SubscriptionRecord | null> {
    const sub = await this.subscriptions.getById(subscriptionId);
    if (!sub) return null;

    const meta = { ...(sub.metadata ?? {}) };
    const hadDunning =
      meta[META.stage] != null || meta[META.attempt] != null;
    if (!hadDunning && sub.status === 'active') return sub;

    delete meta[META.stage];
    delete meta[META.attempt];
    delete meta[META.nextRetryAt];
    delete meta[META.lastFailedAt];
    delete meta[META.suspendedAt];
    delete meta[META.expiresAt];

    const now = new Date();
    const clearedMeta = Object.keys(meta).length > 0 ? meta : null;

    // past_due recovery or first payment on scheduled → active
    if (sub.status === 'past_due' || sub.status === 'scheduled') {
      const periodStart = sub.currentPeriodStartAt ?? now;
      let periodEnd = sub.currentPeriodEndAt;
      if (!periodEnd) {
        periodEnd = new Date(periodStart);
        periodEnd.setUTCMonth(periodEnd.getUTCMonth() + 1);
      }
      const updated = await this.subscriptions.update(sub.id, {
        status: 'active',
        currentPeriodStartAt: periodStart,
        currentPeriodEndAt: periodEnd,
        metadata: clearedMeta,
        updatedAt: now,
      });
      return updated ?? null;
    }

    if (hadDunning) {
      const updated = await this.subscriptions.update(sub.id, {
        metadata: clearedMeta,
        updatedAt: now,
      });
      return updated ?? null;
    }

    return sub;
  }

  /**
   * Advance dunning for past_due subs whose retry/grace windows elapsed.
   * Call at the start of each billing cycle run.
   */
  async processDue(now: Date = new Date()): Promise<number> {
    if (!this.subscriptions.listByStatus) return 0;

    const pastDue = await this.subscriptions.listByStatus('past_due');
    let processed = 0;

    for (const sub of pastDue) {
      const meta = sub.metadata ?? {};
      const stage = readStage(meta);

      if (stage === 'retrying') {
        const nextRaw = metaString(meta, META.nextRetryAt);
        if (!nextRaw) continue;
        const nextAt = new Date(nextRaw);
        if (Number.isNaN(nextAt.getTime()) || nextAt > now) continue;
        await this.onPaymentFailure(sub.id, now);
        processed++;
        continue;
      }

      if (stage === 'suspended') {
        const expRaw = metaString(meta, META.expiresAt);
        if (!expRaw) continue;
        const expAt = new Date(expRaw);
        if (Number.isNaN(expAt.getTime()) || expAt > now) continue;
        await this.onPaymentFailure(sub.id, now);
        processed++;
      }
    }

    return processed;
  }

  private async expire(
    sub: SubscriptionRecord,
    meta: Record<string, string>,
    now: Date,
  ): Promise<SubscriptionRecord> {
    meta[META.stage] = 'expired';
    delete meta[META.nextRetryAt];

    const updated = await this.subscriptions.update(sub.id, {
      status: 'ended',
      metadata: meta,
      updatedAt: now,
    });
    if (!updated) throw new Error(`Failed to expire subscription: ${sub.id}`);
    await this.callbacks.onExpire?.(updated);
    return updated;
  }

  private async ensurePastDue(
    sub: SubscriptionRecord,
    meta: Record<string, string>,
    now: Date,
  ): Promise<SubscriptionRecord> {
    if (sub.status === 'past_due') {
      const updated = await this.subscriptions.update(sub.id, {
        metadata: meta,
        updatedAt: now,
      });
      if (!updated) throw new Error(`Failed to update subscription: ${sub.id}`);
      return updated;
    }

    // active / scheduled / other → past_due + metadata
    const updated = await this.subscriptions.update(sub.id, {
      status: 'past_due',
      metadata: meta,
      updatedAt: now,
    });
    if (!updated) throw new Error(`Failed to mark past_due: ${sub.id}`);
    return updated;
  }
}
