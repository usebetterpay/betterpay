// ── Drizzle Entitlement Repository ───────────────────────────────────────
// Implements EntitlementRepository using drizzle-orm + pg.

import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { betterpayEntitlement } from '../schema';
import type { EntitlementRecord } from '../types';

type DrizzleDB = any;

export function createDrizzleEntitlementRepo(db: DrizzleDB) {
  return {
    async create(data: {
      customerId: string;
      featureId: string;
      subscriptionId: string;
      limit: number | null;
      used: number;
      nextResetAt: Date | null;
    }): Promise<EntitlementRecord> {
      const id = `ent_${randomUUID().slice(0, 12)}`;
      const now = new Date();

      const [record] = await db
        .insert(betterpayEntitlement)
        .values({
          id,
          customerId: data.customerId,
          featureId: data.featureId,
          subscriptionId: data.subscriptionId,
          limit: data.limit,
          used: data.used,
          nextResetAt: data.nextResetAt,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      return record as EntitlementRecord;
    },

    async getByCustomerAndFeature(
      customerId: string,
      featureId: string,
    ): Promise<EntitlementRecord[]> {
      const records = await db
        .select()
        .from(betterpayEntitlement)
        .where(
          and(
            eq(betterpayEntitlement.customerId, customerId),
            eq(betterpayEntitlement.featureId, featureId),
          ),
        );

      return records as EntitlementRecord[];
    },

    async deduct(
      id: string,
      amount: number,
      newNextResetAt?: Date | null,
    ): Promise<EntitlementRecord | undefined> {
      const updates: Record<string, any> = {
        used: db.$increment
          ? undefined // Use SQL increment if available
          : undefined,
        updatedAt: new Date(),
      };

      if (newNextResetAt !== undefined) {
        updates.nextResetAt = newNextResetAt;
      }

      // Fallback: read current, increment, update
      const [current] = await db
        .select()
        .from(betterpayEntitlement)
        .where(eq(betterpayEntitlement.id, id))
        .limit(1);

      if (!current) return undefined;

      updates.used = current.used + amount;

      const [record] = await db
        .update(betterpayEntitlement)
        .set(updates)
        .where(eq(betterpayEntitlement.id, id))
        .returning();

      return record as EntitlementRecord | undefined;
    },

    async resetIfNeeded(
      id: string,
      now: Date,
    ): Promise<EntitlementRecord | undefined> {
      const [current] = await db
        .select()
        .from(betterpayEntitlement)
        .where(eq(betterpayEntitlement.id, id))
        .limit(1);

      if (!current) return undefined;
      if (!current.nextResetAt || current.nextResetAt > now) return current as EntitlementRecord;

      const [record] = await db
        .update(betterpayEntitlement)
        .set({ used: 0, updatedAt: now })
        .where(eq(betterpayEntitlement.id, id))
        .returning();

      return record as EntitlementRecord | undefined;
    },

    async deleteBySubscription(subscriptionId: string): Promise<void> {
      await db
        .delete(betterpayEntitlement)
        .where(eq(betterpayEntitlement.subscriptionId, subscriptionId));
    },
  };
}
