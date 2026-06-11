// ── Drizzle Subscription Repository ──────────────────────────────────────
// Implements SubscriptionRepository using drizzle-orm + pg.

import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { betterpaySubscription } from '../schema';
import type { SubscriptionRecord, SubscriptionStatus } from '../types';

type DrizzleDB = any;

export function createDrizzleSubscriptionRepo(db: DrizzleDB) {
  return {
    async create(data: {
      customerId: string;
      planId: string;
      group: string;
      status: SubscriptionStatus;
      cancelAtPeriodEnd?: boolean;
      currentPeriodStartAt?: Date | null;
      currentPeriodEndAt?: Date | null;
    }): Promise<SubscriptionRecord> {
      const id = `sub_${randomUUID().slice(0, 12)}`;
      const now = new Date();

      const [record] = await db
        .insert(betterpaySubscription)
        .values({
          id,
          customerId: data.customerId,
          planId: data.planId,
          groupId: data.group,
          status: data.status,
          cancelAtPeriodEnd: data.cancelAtPeriodEnd ?? false,
          currentPeriodStartAt: data.currentPeriodStartAt ?? null,
          currentPeriodEndAt: data.currentPeriodEndAt ?? null,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      return record as SubscriptionRecord;
    },

    async getById(id: string): Promise<SubscriptionRecord | undefined> {
      const [record] = await db
        .select()
        .from(betterpaySubscription)
        .where(eq(betterpaySubscription.id, id))
        .limit(1);

      return record as SubscriptionRecord | undefined;
    },

    async getActiveByCustomerAndGroup(
      customerId: string,
      group: string,
    ): Promise<SubscriptionRecord | undefined> {
      const [record] = await db
        .select()
        .from(betterpaySubscription)
        .where(
          and(
            eq(betterpaySubscription.customerId, customerId),
            eq(betterpaySubscription.groupId, group),
            eq(betterpaySubscription.status, 'active'),
          ),
        )
        .limit(1);

      return record as SubscriptionRecord | undefined;
    },

    async getScheduledByCustomerAndGroup(
      customerId: string,
      group: string,
    ): Promise<SubscriptionRecord[]> {
      const records = await db
        .select()
        .from(betterpaySubscription)
        .where(
          and(
            eq(betterpaySubscription.customerId, customerId),
            eq(betterpaySubscription.groupId, group),
            eq(betterpaySubscription.status, 'scheduled'),
          ),
        );

      return records as SubscriptionRecord[];
    },

    async update(
      id: string,
      data: Partial<SubscriptionRecord>,
    ): Promise<SubscriptionRecord | undefined> {
      const { id: _id, createdAt: _ca, ...updates } = data;
      updates.updatedAt = new Date();

      const [record] = await db
        .update(betterpaySubscription)
        .set(updates)
        .where(eq(betterpaySubscription.id, id))
        .returning();

      return record as SubscriptionRecord | undefined;
    },

    async cancel(id: string): Promise<SubscriptionRecord | undefined> {
      const [record] = await db
        .update(betterpaySubscription)
        .set({ status: 'canceled', updatedAt: new Date() })
        .where(eq(betterpaySubscription.id, id))
        .returning();

      return record as SubscriptionRecord | undefined;
    },
  };
}
