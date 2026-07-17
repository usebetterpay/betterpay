// ── Drizzle Webhook Event Repository ─────────────────────────────────────
// Durable idempotency store implementing core WebhookEventRepository.

import { and, eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { paymentWebhookEvent } from '../schema';
import type { WebhookEventRepository, WebhookEventRecordInput } from '@betterpay/core';

type DrizzleDB = any;

/**
 * PostgreSQL-backed webhook event store.
 * Uses unique (provider_id, provider_event_id) when providerEventId is set;
 * otherwise uses eventKey as the primary id for fingerprint-based dedup.
 *
 * tryRecord claims; release deletes the row so failed applies can be retried.
 */
export function createDrizzleWebhookEventRepo(db: DrizzleDB): WebhookEventRepository {
  return {
    async tryRecord(input: WebhookEventRecordInput): Promise<{ wasDuplicate: boolean }> {
      const providerEventId = input.providerEventId ?? input.eventKey;
      const id = `whe_${randomUUID().slice(0, 12)}`;

      try {
        await db.insert(paymentWebhookEvent).values({
          id,
          providerId: input.providerId,
          providerEventId,
          eventName: input.eventName ?? null,
          payload: input.payload ?? null,
          signatureValid: true,
          processed: true,
          createdAt: new Date(),
        });
        return { wasDuplicate: false };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        const code = (err as { code?: string })?.code;
        if (
          code === '23505' ||
          message.includes('unique') ||
          message.includes('duplicate') ||
          message.includes('UNIQUE')
        ) {
          return { wasDuplicate: true };
        }
        throw err;
      }
    },

    async release(eventKey: string): Promise<void> {
      // eventKey is either "providerId:providerEventId" or fingerprint form;
      // drizzle rows store providerEventId = providerEventId ?? eventKey.
      // Delete by provider_event_id match for the full eventKey or suffix.
      await db
        .delete(paymentWebhookEvent)
        .where(eq(paymentWebhookEvent.providerEventId, eventKey));

      // Also try providerId:eventId split form
      const colon = eventKey.indexOf(':');
      if (colon > 0) {
        const providerId = eventKey.slice(0, colon);
        const providerEventId = eventKey.slice(colon + 1);
        await db
          .delete(paymentWebhookEvent)
          .where(
            and(
              eq(paymentWebhookEvent.providerId, providerId),
              eq(paymentWebhookEvent.providerEventId, providerEventId),
            ),
          );
      }
    },
  };
}

/**
 * In-process fake that mirrors durable semantics for adapter unit tests
 * without a live database.
 */
export function createMapWebhookEventRepo(): WebhookEventRepository & {
  keys: Set<string>;
} {
  const keys = new Set<string>();
  return {
    keys,
    async tryRecord(input) {
      if (keys.has(input.eventKey)) return { wasDuplicate: true };
      keys.add(input.eventKey);
      return { wasDuplicate: false };
    },
    async release(eventKey) {
      keys.delete(eventKey);
    },
  };
}
