// ── Webhook Handler ───────────────────────────────────────────────────────
// Processes inbound provider webhooks:
//   1. Verify signature
//   2. Normalize event
//   3. Idempotency check
//   4. Update transaction status

import type { PaymentProvider, WebhookData, NormalizedWebhookEvent } from '../provider/interface';
import type { TransactionService } from '../transaction/service';

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
}

export class WebhookHandler {
  private providerMap: Map<string, PaymentProvider>;
  private processedEvents = new Set<string>(); // In-memory idempotency (MVP)
  private txService: TransactionService;

  constructor(deps: WebhookHandlerDeps) {
    this.providerMap = new Map(deps.providers.map((p) => [p.id, p]));
    this.txService = deps.transactionService;
  }

  async handle(providerId: string, data: WebhookData): Promise<WebhookResult> {
    // 1. Find provider
    const provider = this.providerMap.get(providerId);
    if (!provider) {
      return { success: false, error: `Unknown provider: ${providerId}` };
    }

    // 2. Verify signature
    const valid = await provider.verifyWebhook(data);
    if (!valid) {
      return { success: false, error: `Invalid webhook signature for ${providerId}` };
    }

    // 3. Normalize events
    const events = await provider.normalizeWebhook(data);
    if (events.length === 0) {
      return { success: false, error: 'No events normalized from webhook' };
    }

    const event = events[0]!;

    // 4. Idempotency check
    const eventId = this.buildEventKey(providerId, event);
    if (this.processedEvents.has(eventId)) {
      return { success: true, eventName: event.name, duplicate: true };
    }

    // 5. Find transaction by orderId in payload
    const orderId = this.extractOrderId(event);
    if (!orderId) {
      return { success: false, error: 'Could not extract order_id from webhook payload' };
    }

    const txn = await this.txService.getByOrderId(orderId);
    if (!txn) {
      return { success: false, error: `Transaction not found: ${orderId}` };
    }

    // 6. Determine target status and update
    const targetStatus = EVENT_STATUS_MAP[event.name];
    if (!targetStatus) {
      return { success: false, error: `Unknown event name: ${event.name}` };
    }

    try {
      await this.txService.updateStatus(orderId, targetStatus as any);
    } catch (error) {
      // State machine violation or missing txn — surface as error
      return { success: false, error: (error as Error).message };
    }

    // 7. Mark as processed
    this.processedEvents.add(eventId);

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
