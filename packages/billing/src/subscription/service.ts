// ── Subscription service ─────────────────────────────────────────────────

import type { SubscriptionRecord, SubscriptionStatus, PlanDefinition } from '../types';
import { isValidSubscriptionTransition } from './state-machine';

/** Minimal repository contract for subscriptions. */
export interface SubscriptionRepository {
  create(data: {
    customerId: string;
    planId: string;
    group: string;
    status: SubscriptionStatus;
    cancelAtPeriodEnd?: boolean;
    currentPeriodStartAt?: Date | null;
    currentPeriodEndAt?: Date | null;
  }): Promise<SubscriptionRecord>;

  getById(id: string): Promise<SubscriptionRecord | undefined>;

  getActiveByCustomerAndGroup(
    customerId: string,
    group: string,
  ): Promise<SubscriptionRecord | undefined>;

  getScheduledByCustomerAndGroup(
    customerId: string,
    group: string,
  ): Promise<SubscriptionRecord[]>;

  update(id: string, data: Partial<SubscriptionRecord>): Promise<SubscriptionRecord | undefined>;

  cancel(id: string): Promise<SubscriptionRecord | undefined>;
}

export class SubscriptionService {
  constructor(private readonly repo: SubscriptionRepository) {}

  /** Create a new subscription (directly active for free plans). */
  async subscribe(input: {
    customerId: string;
    plan: PlanDefinition;
    periodStart?: Date;
    periodEnd?: Date;
  }): Promise<SubscriptionRecord> {
    const { customerId, plan, periodStart, periodEnd } = input;

    // Check for existing active subscription in same group
    const existing = await this.repo.getActiveByCustomerAndGroup(customerId, plan.group);
    if (existing) {
      throw new Error(
        `Customer ${customerId} already has an active subscription in group "${plan.group}" (plan: ${existing.planId})`,
      );
    }

    // Free plans activate immediately; paid plans start as scheduled
    const isPaid = plan.price && plan.price.amount > 0;
    const status: SubscriptionStatus = isPaid ? 'scheduled' : 'active';

    return this.repo.create({
      customerId,
      planId: plan.id,
      group: plan.group,
      status,
      currentPeriodStartAt: periodStart ?? (status === 'active' ? new Date() : null),
      currentPeriodEndAt: periodEnd ?? null,
    });
  }

  /** Activate a subscription (e.g., after payment confirmed). */
  async activate(id: string, periodStart: Date, periodEnd: Date): Promise<SubscriptionRecord> {
    return this.transition(id, 'active', {
      currentPeriodStartAt: periodStart,
      currentPeriodEndAt: periodEnd,
    });
  }

  /** Cancel a subscription (immediately or at period end). */
  async cancel(id: string, atPeriodEnd = false): Promise<SubscriptionRecord> {
    const sub = await this.repo.getById(id);
    if (!sub) throw new Error(`Subscription not found: ${id}`);

    if (atPeriodEnd) {
      const updated = await this.repo.update(id, { cancelAtPeriodEnd: true });
      if (!updated) throw new Error(`Failed to update subscription: ${id}`);
      return updated;
    }

    return this.transition(id, 'canceled');
  }

  /** Mark a subscription as past_due (failed payment). */
  async markPastDue(id: string): Promise<SubscriptionRecord> {
    return this.transition(id, 'past_due');
  }

  /** End a subscription (terminal state for period-end cancellations). */
  async end(id: string): Promise<SubscriptionRecord> {
    return this.transition(id, 'ended');
  }

  /** Upgrade: cancel current, subscribe to new plan immediately. */
  async upgrade(input: {
    currentSubscriptionId: string;
    newPlan: PlanDefinition;
  }): Promise<SubscriptionRecord> {
    const { currentSubscriptionId, newPlan } = input;
    const current = await this.repo.getById(currentSubscriptionId);
    if (!current) throw new Error(`Subscription not found: ${currentSubscriptionId}`);

    // End current subscription
    await this.transition(currentSubscriptionId, 'ended');

    // Create new subscription immediately active
    return this.repo.create({
      customerId: current.customerId,
      planId: newPlan.id,
      group: newPlan.group,
      status: 'active',
      currentPeriodStartAt: new Date(),
      currentPeriodEndAt: current.currentPeriodEndAt,
    });
  }

  /** Downgrade: schedule plan change at period end. */
  async downgrade(input: {
    currentSubscriptionId: string;
    newPlan: PlanDefinition;
  }): Promise<{ current: SubscriptionRecord; scheduled: SubscriptionRecord }> {
    const { currentSubscriptionId, newPlan } = input;
    const current = await this.repo.getById(currentSubscriptionId);
    if (!current) throw new Error(`Subscription not found: ${currentSubscriptionId}`);

    // Mark current for cancellation at period end
    const updatedCurrent = await this.repo.update(currentSubscriptionId, {
      cancelAtPeriodEnd: true,
    });
    if (!updatedCurrent) throw new Error(`Failed to update subscription`);

    // Schedule new plan
    const scheduled = await this.repo.create({
      customerId: current.customerId,
      planId: newPlan.id,
      group: newPlan.group,
      status: 'scheduled',
    });

    return { current: updatedCurrent, scheduled };
  }

  /** Get active subscription for a customer in a group. */
  async getActive(customerId: string, group: string): Promise<SubscriptionRecord | undefined> {
    return this.repo.getActiveByCustomerAndGroup(customerId, group);
  }

  // ── Private ────────────────────────────────────────────────────────────

  private async transition(
    id: string,
    to: SubscriptionStatus,
    extra?: Partial<SubscriptionRecord>,
  ): Promise<SubscriptionRecord> {
    const sub = await this.repo.getById(id);
    if (!sub) throw new Error(`Subscription not found: ${id}`);

    if (!isValidSubscriptionTransition(sub.status, to)) {
      throw new Error(`Invalid subscription transition: ${sub.status} → ${to}`);
    }

    const updated = await this.repo.update(id, { status: to, ...extra });
    if (!updated) throw new Error(`Failed to update subscription: ${id}`);
    return updated;
  }
}
