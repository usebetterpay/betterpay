// ── Drizzle Customer Repository ──────────────────────────────────────────
// Implements CustomerRepository using drizzle-orm + pg.

import { eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { betterpayCustomer } from '../schema';
import type { CustomerRecord } from '../types';

type DrizzleDB = any;

export function createDrizzleCustomerRepo(db: DrizzleDB) {
  return {
    async create(data: {
      email: string;
      name?: string;
      phone?: string;
      metadata?: Record<string, string>;
    }): Promise<CustomerRecord> {
      const id = `cust_${randomUUID().slice(0, 12)}`;
      const now = new Date();

      const [record] = await db
        .insert(betterpayCustomer)
        .values({
          id,
          email: data.email,
          name: data.name ?? null,
          phone: data.phone ?? null,
          metadata: data.metadata ?? null,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      return record as CustomerRecord;
    },

    async getById(id: string): Promise<CustomerRecord | undefined> {
      const [record] = await db
        .select()
        .from(betterpayCustomer)
        .where(eq(betterpayCustomer.id, id))
        .limit(1);

      return record as CustomerRecord | undefined;
    },

    async getByEmail(email: string): Promise<CustomerRecord | undefined> {
      const [record] = await db
        .select()
        .from(betterpayCustomer)
        .where(eq(betterpayCustomer.email, email))
        .limit(1);

      return record as CustomerRecord | undefined;
    },

    async update(
      id: string,
      data: Partial<CustomerRecord>,
    ): Promise<CustomerRecord | undefined> {
      const { id: _id, createdAt: _ca, ...updates } = data;
      updates.updatedAt = new Date();

      const [record] = await db
        .update(betterpayCustomer)
        .set(updates)
        .where(eq(betterpayCustomer.id, id))
        .returning();

      return record as CustomerRecord | undefined;
    },

    async delete(id: string): Promise<void> {
      await db
        .delete(betterpayCustomer)
        .where(eq(betterpayCustomer.id, id));
    },

    async list(limit: number, offset: number): Promise<CustomerRecord[]> {
      const records = await db
        .select()
        .from(betterpayCustomer)
        .limit(limit)
        .offset(offset);

      return records as CustomerRecord[];
    },
  };
}
