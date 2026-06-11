// ── Drizzle Transaction Repository ─────────────────────────────────────────
// Implements TransactionRepository using drizzle-orm + pg.

import { eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { paymentTransaction, paymentIdempotencyKey } from '../schema';
import type { TransactionRecord, TransactionStatus } from '../types';

type DrizzleDB = any; // drizzle-orm NodePgDatabase type (avoid hard dep on specific driver)

export function createDrizzleTransactionRepo(db: DrizzleDB) {
  return {
    async createTransaction(data: {
      orderId: string;
      providerId: string;
      amount: number;
      currency: string;
      customerEmail: string;
      metadata?: Record<string, string>;
    }): Promise<TransactionRecord> {
      const id = `txn_${randomUUID().slice(0, 12)}`;
      const now = new Date();

      const [record] = await db
        .insert(paymentTransaction)
        .values({
          id,
          orderId: data.orderId,
          providerId: data.providerId,
          status: 'pending',
          amount: data.amount,
          currency: data.currency,
          customerEmail: data.customerEmail,
          metadata: data.metadata ?? null,
          providerTransactionId: null,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      return record as TransactionRecord;
    },

    async getTransactionByOrderId(orderId: string): Promise<TransactionRecord | undefined> {
      const [record] = await db
        .select()
        .from(paymentTransaction)
        .where(eq(paymentTransaction.orderId, orderId))
        .limit(1);

      return record as TransactionRecord | undefined;
    },

    async updateStatus(
      orderId: string,
      status: TransactionStatus,
      providerTransactionId?: string,
    ): Promise<TransactionRecord | undefined> {
      const updates: Record<string, any> = { status, updatedAt: new Date() };
      if (providerTransactionId) {
        updates.providerTransactionId = providerTransactionId;
      }

      const [record] = await db
        .update(paymentTransaction)
        .set(updates)
        .where(eq(paymentTransaction.orderId, orderId))
        .returning();

      return record as TransactionRecord | undefined;
    },

    async checkIdempotencyKey(key: string): Promise<string | undefined> {
      const [record] = await db
        .select()
        .from(paymentIdempotencyKey)
        .where(eq(paymentIdempotencyKey.key, key))
        .limit(1);

      return record?.transactionId;
    },

    async setIdempotencyKey(key: string, transactionId: string): Promise<void> {
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h TTL
      await db
        .insert(paymentIdempotencyKey)
        .values({ key, transactionId, expiresAt, createdAt: new Date() })
        .onConflictDoNothing();
    },
  };
}
