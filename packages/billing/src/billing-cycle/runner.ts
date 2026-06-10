// ── Billing cycle runner ─────────────────────────────────────────────────
// Generates payment links for upcoming subscriptions each billing cycle.

import type { SubscriptionRecord, PlanDefinition } from '../types';
import type { SubscriptionService } from '../subscription/service';
import type { InvoiceService } from '../invoice/service';
import type { EntitlementService } from '../entitlement/service';
import { computeNextResetAt } from '../entitlement/service';

export interface BillingCycleResult {
  processed: number;
  succeeded: number;
  failed: number;
  errors: Array<{ subscriptionId: string; error: string }>;
}

export interface BillingCycleDeps {
  subscriptionService: SubscriptionService;
  /** Directly update subscription period (no state transition check). */
  updateSubscriptionPeriod: (
    id: string,
    periodStart: Date,
    periodEnd: Date,
  ) => Promise<void>;
  invoiceService: InvoiceService;
  entitlementService: EntitlementService;
  planMap: Map<string, PlanDefinition>;
  /** Find subscriptions whose period ends before this date. */
  findDueSubscriptions: (before: Date) => Promise<SubscriptionRecord[]>;
  /** Create a payment link for a subscription (uses provider registry). */
  createPaymentForSubscription: (
    sub: SubscriptionRecord,
    plan: PlanDefinition,
  ) => Promise<{ paymentUrl: string; providerTransactionId: string }>;
}

export class BillingCycleRunner {
  constructor(private readonly deps: BillingCycleDeps) {}

  /**
   * Run the billing cycle:
   * 1. Find subscriptions due for renewal
   * 2. For each: create invoice + payment link
   * 3. Activate scheduled subscriptions if current one ended
   */
  async run(now?: Date): Promise<BillingCycleResult> {
    const currentTime = now ?? new Date();
    const dueSubs = await this.deps.findDueSubscriptions(currentTime);

    const result: BillingCycleResult = {
      processed: dueSubs.length,
      succeeded: 0,
      failed: 0,
      errors: [],
    };

    for (const sub of dueSubs) {
      try {
        await this.processSubscription(sub, currentTime);
        result.succeeded++;
      } catch (error) {
        result.failed++;
        result.errors.push({
          subscriptionId: sub.id,
          error: (error as Error).message,
        });
      }
    }

    return result;
  }

  private async processSubscription(sub: SubscriptionRecord, now: Date): Promise<void> {
    const plan = this.deps.planMap.get(sub.planId);
    if (!plan) {
      throw new Error(`Plan not found: ${sub.planId}`);
    }

    // If subscription is marked for cancel at period end → end it
    if (sub.cancelAtPeriodEnd) {
      await this.deps.subscriptionService.end(sub.id);
      await this.deps.entitlementService.removeBySubscription(sub.id);
      return;
    }

    // If subscription has ended (past period) → create new invoice + payment
    if (sub.status === 'active' || sub.status === 'past_due') {
      // Create invoice for new period
      const periodEnd = sub.currentPeriodEndAt ?? now;
      const nextPeriodEnd = computeNextResetAt(
        (plan.price?.interval === 'year' ? 'year' : 'month') as 'month' | 'year',
        periodEnd,
      );

      await this.deps.invoiceService.create({
        customerId: sub.customerId,
        subscriptionId: sub.id,
        planId: plan.id,
        amount: plan.price?.amount ?? 0,
        currency: plan.price?.currency ?? 'IDR',
        dueAt: periodEnd,
      });

      // Create payment link
      if (plan.price && plan.price.amount > 0) {
        await this.deps.createPaymentForSubscription(sub, plan);
      }

      // Update subscription period (no state transition — stays active)
      await this.deps.updateSubscriptionPeriod(sub.id, periodEnd, nextPeriodEnd);

      // Reset entitlements
      await this.deps.entitlementService.removeBySubscription(sub.id);
      await this.deps.entitlementService.createEntitlements(
        sub.customerId,
        sub.id,
        plan.includes,
      );
    }
  }
}
