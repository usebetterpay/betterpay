// ── Drizzle Invoice Repository ───────────────────────────────────────────
// Implements InvoiceRepository using drizzle-orm + pg.

import { eq, and, lt } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { betterpayInvoice } from '../schema';
import type { InvoiceRecord, InvoiceStatus } from '../types';

type DrizzleDB = any;

export function createDrizzleInvoiceRepo(db: DrizzleDB) {
  return {
    async create(data: {
      customerId: string;
      subscriptionId: string;
      planId: string;
      amount: number;
      currency: string;
      dueAt: Date;
    }): Promise<InvoiceRecord> {
      const id = `inv_${randomUUID().slice(0, 12)}`;
      const now = new Date();

      const [record] = await db
        .insert(betterpayInvoice)
        .values({
          id,
          customerId: data.customerId,
          subscriptionId: data.subscriptionId,
          planId: data.planId,
          amount: data.amount,
          currency: data.currency,
          status: 'open',
          dueAt: data.dueAt,
          paidAt: null,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      return record as InvoiceRecord;
    },

    async getById(id: string): Promise<InvoiceRecord | undefined> {
      const [record] = await db
        .select()
        .from(betterpayInvoice)
        .where(eq(betterpayInvoice.id, id))
        .limit(1);

      return record as InvoiceRecord | undefined;
    },

    async getBySubscription(subscriptionId: string): Promise<InvoiceRecord[]> {
      const records = await db
        .select()
        .from(betterpayInvoice)
        .where(eq(betterpayInvoice.subscriptionId, subscriptionId));

      return records as InvoiceRecord[];
    },

    async updateStatus(
      id: string,
      status: InvoiceStatus,
      paidAt?: Date,
    ): Promise<InvoiceRecord | undefined> {
      const updates: Record<string, any> = { status, updatedAt: new Date() };
      if (paidAt) {
        updates.paidAt = paidAt;
      }

      const [record] = await db
        .update(betterpayInvoice)
        .set(updates)
        .where(eq(betterpayInvoice.id, id))
        .returning();

      return record as InvoiceRecord | undefined;
    },

    async getOverdue(now: Date): Promise<InvoiceRecord[]> {
      const records = await db
        .select()
        .from(betterpayInvoice)
        .where(
          and(
            eq(betterpayInvoice.status, 'open'),
            lt(betterpayInvoice.dueAt, now),
          ),
        );

      return records as InvoiceRecord[];
    },
  };
}
