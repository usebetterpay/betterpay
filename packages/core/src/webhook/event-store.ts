// ── Webhook event store — durable (or in-memory) idempotency ─────────────
// Used by WebhookHandler to dedupe provider callbacks across process restarts
// when a shared/durable implementation is injected.
//
// Contract:
//   tryRecord claims a key (first writer wins).
//   release unclaims a key after a failed apply so provider retries can succeed.
//   Successful applies keep the claim forever.

export interface WebhookEventRecordInput {
  /** Stable key: providerId + providerEventId (or fingerprint). */
  eventKey: string;
  providerId: string;
  providerEventId?: string;
  eventName?: string;
  payload?: Record<string, unknown>;
}

export interface WebhookEventRepository {
  /**
   * Try to claim an event for processing.
   * Returns `{ wasDuplicate: true }` if the key was already recorded (successfully processed).
   * Returns `{ wasDuplicate: false }` if this call successfully claimed it.
   */
  tryRecord(input: WebhookEventRecordInput): Promise<{ wasDuplicate: boolean }>;

  /**
   * Release a claim after a failed apply (missing txn, bad transition, etc.)
   * so a later provider retry can process the same event.
   * No-op if the key was never claimed.
   */
  release(eventKey: string): Promise<void>;
}

/**
 * Process-local store. Safe for tests and single-process dev only.
 * Production must inject a durable implementation (e.g. drizzle).
 */
export class InMemoryWebhookEventRepository implements WebhookEventRepository {
  private readonly keys = new Set<string>();

  async tryRecord(input: WebhookEventRecordInput): Promise<{ wasDuplicate: boolean }> {
    if (this.keys.has(input.eventKey)) {
      return { wasDuplicate: true };
    }
    this.keys.add(input.eventKey);
    return { wasDuplicate: false };
  }

  async release(eventKey: string): Promise<void> {
    this.keys.delete(eventKey);
  }

  /** Test helper: number of recorded keys. */
  size(): number {
    return this.keys.size;
  }

  /** Test helper: whether a key is currently claimed. */
  has(eventKey: string): boolean {
    return this.keys.has(eventKey);
  }
}
