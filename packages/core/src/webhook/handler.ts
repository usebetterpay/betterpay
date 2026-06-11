// ── Webhook Handler ───────────────────────────────────────────────────────
// Processes inbound provider webhooks:
//   1. Verify signature
//   2. Replay protection (timestamp validation)
//   3. Normalize event
//   4. Idempotency check
//   5. Update transaction status

import type { PaymentProvider, WebhookData, NormalizedWebhookEvent } from '../provider/interface';
import type { TransactionService } from '../transaction/service';
import { validateTimestamp } from './replay-protection';
import type { Logger } from '../logging/logger';

export interface WebhookResult {
  success: boolean;
  eventName?: string;
  duplicate?: boolean;
  error?: string;
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
}

export class WebhookHandler {
  private providerMap: Map<string, PaymentProvider>;
  private processedEvents = new Set<string>(); // In-memory idempotency (MVP)
  private txService: TransactionService;
  private logger?: Logger;

  constructor(deps: WebhookHandlerDeps) {
    this.providerMap = new Map(deps.providers.map((p) => [p.id, p]));
    this.txService = deps.transactionService;
    this.logger = deps.logger;
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

    // 3. Replay protection - validate timestamp if present
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

    // 5. Idempotency check
    const eventId = this.buildEventKey(providerId, event);
    if (this.processedEvents.has(eventId)) {
      this.logger?.debug('Duplicate webhook event', { providerId, eventName: event.name });
      return { success: true, eventName: event.name, duplicate: true };
    }

    // 6. Find transaction by orderId in payload
    const orderId = this.extractOrderId(event);
    if (!orderId) {
      this.logger?.warn('Could not extract order_id from webhook', { providerId, eventName: event.name });
      return { success: false, error: 'Could not extract order_id from webhook payload' };
    }

    const txn = await this.txService.getByOrderId(orderId);
    if (!txn) {
      this.logger?.warn('Transaction not found for webhook', { orderId, providerId });
      return { success: false, error: `Transaction not found: ${orderId}` };
    }

    // 7. Determine target status and update
    const targetStatus = EVENT_STATUS_MAP[event.name];
    if (!targetStatus) {
      this.logger?.warn('Unknown webhook event name', { eventName: event.name, providerId });
      return { success: false, error: `Unknown event name: ${event.name}` };
    }

    try {
      await this.txService.updateStatus(orderId, targetStatus as any);
    } catch (error) {
      // State machine violation or missing txn — surface as error
      this.logger?.error('Failed to update transaction status', { 
        orderId, 
        targetStatus, 
        error: error instanceof Error ? error.message : String(error) 
      });
      return { success: false, error: (error as Error).message };
    }

    // 8. Mark as processed
    this.processedEvents.add(eventId);

    this.logger?.info('Webhook processed successfully', { 
      providerId, 
      eventName: event.name,
      orderId,
      newStatus: targetStatus 
    });

    return { success: true, eventName: event.name };
  }

  // ── Helpers ────────────────────────────────────────────────────────────

  private buildEventKey(providerId: string, event: NormalizedWebhookEvent): string {
    return `${providerId}:${event.providerEventId ?? event.name}:${JSON.stringify(event.payload).slice(0, 100)}`;
  }

  private extractOrderId(event: NormalizedWebhookEvent): string | undefined {
    const payload = event.payload;
    return (payload.order_id ?? payload.reference_id ?? payload.orderId) as string | undefined;
  }
}
