// ── Entitlement engine ───────────────────────────────────────────────────
// check() — read-only balance lookup with lazy reset
// report() — deduct usage atomically

import type {
  EntitlementRecord,
  EntitlementBalance,
  CheckResult,
  ReportResult,
  FeatureInclude,
  MeteredResetInterval,
} from '../types';

export interface EntitlementRepository {
  create(data: {
    customerId: string;
    featureId: string;
    subscriptionId: string;
    limit: number | null;
    used: number;
    nextResetAt: Date | null;
  }): Promise<EntitlementRecord>;

  getByCustomerAndFeature(
    customerId: string,
    featureId: string,
  ): Promise<EntitlementRecord[]>;

  deduct(id: string, amount: number, newNextResetAt?: Date | null): Promise<EntitlementRecord | undefined>;
  resetIfNeeded(id: string, now: Date): Promise<EntitlementRecord | undefined>;
  deleteBySubscription(subscriptionId: string): Promise<void>;
}

export class EntitlementService {
  constructor(private readonly repo: EntitlementRepository) {}

  /**
   * Create entitlements for a subscription based on its plan features.
   */
  async createEntitlements(
    customerId: string,
    subscriptionId: string,
    features: FeatureInclude[],
  ): Promise<void> {
    for (const feature of features) {
      if (feature.type === 'boolean') {
        // Boolean features get unlimited entitlement
        await this.repo.create({
          customerId,
          featureId: feature.featureId,
          subscriptionId,
          limit: null, // unlimited
          used: 0,
          nextResetAt: null,
        });
      } else if (feature.type === 'metered' && feature.metered) {
        const nextReset = computeNextResetAt(feature.metered.reset);
        await this.repo.create({
          customerId,
          featureId: feature.featureId,
          subscriptionId,
          limit: feature.metered.limit,
          used: 0,
          nextResetAt: nextReset,
        });
      }
    }
  }

  /**
   * Check if a customer is allowed to use a feature (read-only).
   */
  async check(customerId: string, featureId: string): Promise<CheckResult> {
    const entitlements = await this.repo.getByCustomerAndFeature(customerId, featureId);

    if (entitlements.length === 0) {
      return {
        allowed: false,
        balance: {
          featureId,
          limit: 0,
          remaining: 0,
          resetAt: null,
          unlimited: false,
        },
      };
    }

    const balance = aggregateBalance(featureId, entitlements);
    const allowed = balance.unlimited || (balance.remaining !== null && balance.remaining > 0);

    return { allowed, balance };
  }

  /**
   * Report usage (deduct) for a metered feature.
   */
  async report(
    customerId: string,
    featureId: string,
    amount: number,
  ): Promise<ReportResult> {
    if (amount <= 0) throw new Error('Report amount must be positive');

    const entitlements = await this.repo.getByCustomerAndFeature(customerId, featureId);

    if (entitlements.length === 0) {
      return {
        success: false,
        balance: { featureId, limit: 0, remaining: 0, resetAt: null, unlimited: false },
      };
    }

    // Lazy reset any stale entitlements
    const now = new Date();
    const fresh: EntitlementRecord[] = [];
    for (const ent of entitlements) {
      if (ent.nextResetAt && ent.nextResetAt <= now) {
        const reset = await this.repo.resetIfNeeded(ent.id, now);
        fresh.push(reset ?? ent);
      } else {
        fresh.push(ent);
      }
    }

    // Greedy deduct: use the first entitlement that has enough remaining
    for (const ent of fresh) {
      const remaining = ent.limit === null ? Number.POSITIVE_INFINITY : ent.limit - ent.used;
      if (remaining >= amount) {
        const deducted = await this.repo.deduct(ent.id, amount);
        const record = deducted ?? { ...ent, used: ent.used + amount };
        return {
          success: true,
          balance: toBalance(featureId, record),
        };
      }
    }

    // No single entitlement can cover the full amount — deny
    return {
      success: false,
      balance: aggregateBalance(featureId, fresh),
    };
  }

  /**
   * Remove all entitlements for a subscription (on cancel/end).
   */
  async removeBySubscription(subscriptionId: string): Promise<void> {
    await this.repo.deleteBySubscription(subscriptionId);
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────

function aggregateBalance(
  featureId: string,
  entitlements: EntitlementRecord[],
): EntitlementBalance {
  let totalLimit = 0;
  let totalRemaining = 0;
  let unlimited = false;
  let earliestReset: Date | null = null;

  for (const ent of entitlements) {
    if (ent.limit === null) {
      unlimited = true;
    } else {
      totalLimit += ent.limit;
      totalRemaining += Math.max(0, ent.limit - ent.used);
    }
    if (ent.nextResetAt && (!earliestReset || ent.nextResetAt < earliestReset)) {
      earliestReset = ent.nextResetAt;
    }
  }

  return {
    featureId,
    limit: unlimited ? null : totalLimit,
    remaining: unlimited ? null : totalRemaining,
    resetAt: earliestReset,
    unlimited,
  };
}

function toBalance(featureId: string, ent: EntitlementRecord): EntitlementBalance {
  return {
    featureId,
    limit: ent.limit,
    remaining: ent.limit === null ? null : Math.max(0, ent.limit - ent.used),
    resetAt: ent.nextResetAt,
    unlimited: ent.limit === null,
  };
}

export function computeNextResetAt(interval: MeteredResetInterval, from?: Date): Date {
  const now = from ?? new Date();
  const next = new Date(now);

  switch (interval) {
    case 'day':
      next.setDate(next.getDate() + 1);
      break;
    case 'week':
      next.setDate(next.getDate() + 7);
      break;
    case 'month':
      next.setMonth(next.getMonth() + 1);
      break;
    case 'year':
      next.setFullYear(next.getFullYear() + 1);
      break;
  }

  return next;
}
