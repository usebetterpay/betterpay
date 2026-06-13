// ── CredentialRepository — Drizzle/PostgreSQL implementation ──────────────

import { eq } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { paymentGatewayConfig } from '../schema';
import type { CredentialRepository, CredentialRecord } from '@betterpay/core';

export class DrizzleCredentialRepository implements CredentialRepository {
  constructor(private db: PostgresJsDatabase) {}

  async findByProviderId(providerId: string): Promise<CredentialRecord | null> {
    const rows = await this.db
      .select()
      .from(paymentGatewayConfig)
      .where(eq(paymentGatewayConfig.providerId, providerId))
      .limit(1);

    if (rows.length === 0) return null;

    const row = rows[0]!;
    return {
      id: row.id,
      providerId: row.providerId,
      credentials: row.credentials as Record<string, string>,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async findAll(): Promise<CredentialRecord[]> {
    const rows = await this.db.select().from(paymentGatewayConfig);

    return rows.map((row) => ({
      id: row.id,
      providerId: row.providerId,
      credentials: row.credentials as Record<string, string>,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
  }

  async save(record: CredentialRecord): Promise<void> {
    const existing = await this.findByProviderId(record.providerId);

    if (existing) {
      await this.db
        .update(paymentGatewayConfig)
        .set({
          credentials: record.credentials as Record<string, unknown>,
          updatedAt: new Date(),
        })
        .where(eq(paymentGatewayConfig.providerId, record.providerId));
    } else {
      await this.db.insert(paymentGatewayConfig).values({
        id: record.id,
        providerId: record.providerId,
        credentials: record.credentials as Record<string, unknown>,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      });
    }
  }

  async deleteByProviderId(providerId: string): Promise<void> {
    await this.db
      .delete(paymentGatewayConfig)
      .where(eq(paymentGatewayConfig.providerId, providerId));
  }
}
