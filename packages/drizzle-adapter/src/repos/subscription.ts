// ── Drizzle Subscription Repository ──────────────────────────────────────
// Implements SubscriptionRepository using drizzle-orm + pg.

import { eq, and, lte, or, isNotNull } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { betterpaySubscription } from '../schema';
import type { SubscriptionRecord, SubscriptionStatus } from '../types';
import { toSubscriptionRecord } from '../mappers';

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
      metadata?: Record<string, string> | null;
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
          metadata: data.metadata ?? null,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      return toSubscriptionRecord(record);
    },

    async getById(id: string): Promise<SubscriptionRecord | undefined> {
      const [record] = await db
        .select()
        .from(betterpaySubscription)
        .where(eq(betterpaySubscription.id, id))
        .limit(1);

      return record ? toSubscriptionRecord(record) : undefined;
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

      return record ? toSubscriptionRecord(record) : undefined;
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

      return records.map(toSubscriptionRecord);
    },

    async update(
      id: string,
      data: Partial<SubscriptionRecord>,
    ): Promise<SubscriptionRecord | undefined> {
      const { id: _id, createdAt: _ca, group, ...rest } = data;
      const updates: Record<string, unknown> = { ...rest, updatedAt: new Date() };
      if (group !== undefined) {
        updates.groupId = group;
      }

      const [record] = await db
        .update(betterpaySubscription)
        .set(updates)
        .where(eq(betterpaySubscription.id, id))
        .returning();

      return record ? toSubscriptionRecord(record) : undefined;
    },

    async cancel(id: string): Promise<SubscriptionRecord | undefined> {
      const [record] = await db
        .update(betterpaySubscription)
        .set({ status: 'canceled', updatedAt: new Date() })
        .where(eq(betterpaySubscription.id, id))
        .returning();

      return record ? toSubscriptionRecord(record) : undefined;
    },

    async listDue(before: Date): Promise<SubscriptionRecord[]> {
      const records = await db
        .select()
        .from(betterpaySubscription)
        .where(
          and(
            or(
              eq(betterpaySubscription.status, 'active'),
              eq(betterpaySubscription.status, 'past_due'),
            ),
            isNotNull(betterpaySubscription.currentPeriodEndAt),
            lte(betterpaySubscription.currentPeriodEndAt, before),
          ),
        );
      return records.map(toSubscriptionRecord);
    },

    async listByStatus(status: SubscriptionStatus): Promise<SubscriptionRecord[]> {
      const records = await db
        .select()
        .from(betterpaySubscription)
        .where(eq(betterpaySubscription.status, status));
      return records.map(toSubscriptionRecord);
    },
  };
}
