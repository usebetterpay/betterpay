// ── Webhook Handler ───────────────────────────────────────────────────────
// Processes inbound provider webhooks:
//   1. Verify signature
//   2. Replay protection (timestamp validation when header present)
//   3. Normalize event
//   4. Claim event key (idempotency) — release on apply failure
//   5. Update transaction status — only then keep the claim

import type { PaymentProvider, WebhookData, NormalizedWebhookEvent } from '../provider/interface';
import type { TransactionService } from '../transaction/service';
import { validateTimestamp } from './replay-protection';
import type { Logger } from '../logging/logger';
import {
  InMemoryWebhookEventRepository,
  type WebhookEventRepository,
} from './event-store';

export interface WebhookResult {
  success: boolean;
  eventName?: string;
  duplicate?: boolean;
  error?: string;
  orderId?: string;
}

/** Maps normalized event names → target transaction status. */
const EVENT_STATUS_MAP: Record<string, string> = {
  'payment.completed': 'completed',
  'payment.succeeded': 'completed',
  'payment.expired': 'expired',
  'payment.failed': 'failed',
  'payment.canceled': 'canceled',
  'payment.pending': 'active',
};

export interface WebhookHandlerDeps {
  providers: PaymentProvider[];
  transactionService: TransactionService;
  logger?: Logger;
  /**
   * Event store for idempotency. Defaults to process-local in-memory store.
   * Inject a durable store (e.g. drizzle) for production so restarts cannot
   * re-apply the same webhook after a successful process.
   */
  webhookEventRepository?: WebhookEventRepository;
}

export class WebhookHandler {
  private providerMap: Map<string, PaymentProvider>;
  private eventStore: WebhookEventRepository;
  private txService: TransactionService;
  private logger?: Logger;

  constructor(deps: WebhookHandlerDeps) {
    this.providerMap = new Map(deps.providers.map((p) => [p.id, p]));
    this.txService = deps.transactionService;
    this.logger = deps.logger;
    this.eventStore = deps.webhookEventRepository ?? new InMemoryWebhookEventRepository();
  }

  async handle(providerId: string, data: WebhookData): Promise<WebhookResult> {
    // 1. Find provider
    const provider = this.providerMap.get(providerId);
    if (!provider) {
      this.logger?.warn('Webhook from unknown provider', { providerId });
      return { success: false, error: `Unknown provider: ${providerId}` };
    }

    this.logger?.debug('Processing webhook', { providerId });

    // 2. Verify signature
    const valid = await provider.verifyWebhook(data);
    if (!valid) {
      this.logger?.warn('Invalid webhook signature', { providerId });
      return { success: false, error: `Invalid webhook signature for ${providerId}` };
    }

    // 3. Replay protection - validate timestamp if present (not all providers send one)
    const timestampHeader = data.headers['x-webhook-timestamp'] || data.headers['X-Webhook-Timestamp'];
    if (timestampHeader) {
      const timestamp = parseInt(timestampHeader as string, 10);
      if (!isNaN(timestamp)) {
        const validation = validateTimestamp(timestamp);
        if (!validation.valid) {
          this.logger?.warn('Webhook replay detected', { providerId, reason: validation.error });
          return { success: false, error: validation.error ?? 'Webhook timestamp invalid' };
        }
      }
    }

    // 4. Normalize events
    const events = await provider.normalizeWebhook(data);
    if (events.length === 0) {
      this.logger?.warn('No events normalized', { providerId });
      return { success: false, error: 'No events normalized from webhook' };
    }

    const event = events[0]!;
    const eventKey = this.buildEventKey(providerId, event);

    // 5. Claim event before mutating payment state (concurrency-safe).
    //    On any apply failure we release so provider retries can still succeed.
    const { wasDuplicate } = await this.eventStore.tryRecord({
      eventKey,
      providerId,
      providerEventId: event.providerEventId,
      eventName: event.name,
      payload: event.payload,
    });

    if (wasDuplicate) {
      this.logger?.debug('Duplicate webhook event', { providerId, eventName: event.name });
      return {
        success: true,
        eventName: event.name,
        duplicate: true,
        orderId: this.extractOrderId(event),
      };
    }

    const failAndRelease = async (error: string, log?: Record<string, unknown>): Promise<WebhookResult> => {
      try {
        await this.eventStore.release(eventKey);
      } catch (releaseErr) {
        this.logger?.error('Failed to release webhook event claim', {
          eventKey,
          error: releaseErr instanceof Error ? releaseErr.message : String(releaseErr),
        });
      }
      if (log) this.logger?.warn(error, log);
      else this.logger?.warn(error);
      return { success: false, error };
    };

    // 6. Find transaction by orderId in payload
    const orderId = this.extractOrderId(event);
    if (!orderId) {
      return failAndRelease('Could not extract order_id from webhook payload', {
        providerId,
        eventName: event.name,
      });
    }

    const txn = await this.txService.getByOrderId(orderId);
    if (!txn) {
      return failAndRelease(`Transaction not found: ${orderId}`, { orderId, providerId });
    }

    // 7. Determine target status and update
    const targetStatus = EVENT_STATUS_MAP[event.name];
    if (!targetStatus) {
      return failAndRelease(`Unknown event name: ${event.name}`, {
        eventName: event.name,
        providerId,
      });
    }

    try {
      await this.txService.updateStatus(orderId, targetStatus as any);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger?.error('Failed to update transaction status', {
        orderId,
        targetStatus,
        error: message,
      });
      return failAndRelease(message, { orderId, targetStatus });
    }

    // Claim retained — successful apply
    this.logger?.info('Webhook processed successfully', {
      providerId,
      eventName: event.name,
      orderId,
      newStatus: targetStatus,
    });

    return { success: true, eventName: event.name, orderId };
  }

  // ── Helpers ────────────────────────────────────────────────────────────

  private buildEventKey(providerId: string, event: NormalizedWebhookEvent): string {
    if (event.providerEventId) {
      return `${providerId}:${event.providerEventId}`;
    }
    return `${providerId}:${event.name}:${JSON.stringify(event.payload).slice(0, 100)}`;
  }

  private extractOrderId(event: NormalizedWebhookEvent): string | undefined {
    const payload = event.payload;
    return (payload.order_id ?? payload.reference_id ?? payload.orderId) as string | undefined;
  }
}
