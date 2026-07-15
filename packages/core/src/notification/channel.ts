// ── Notification channels ────────────────────────────────────────────────
// Plugins register channels; factory dispatches billing/payment events.

export type NotificationEventName =
  | 'invoice.created'
  | 'payment.failed'
  | 'subscription.canceled'
  | 'transaction.completed';

export interface NotificationEvent {
  name: NotificationEventName;
  payload: Record<string, unknown>;
  /** Recipient email when known */
  customerEmail?: string;
  /** Recipient phone (E.164 or local) when known */
  customerPhone?: string;
}

export interface NotificationChannel {
  readonly id: string;
  send(event: NotificationEvent): Promise<void>;
}

export class NotificationDispatcher {
  constructor(
    private readonly channels: NotificationChannel[],
    private readonly onError?: (err: unknown, channelId: string, event: NotificationEvent) => void,
  ) {}

  async emit(event: NotificationEvent): Promise<void> {
    await Promise.all(
      this.channels.map(async (ch) => {
        try {
          await ch.send(event);
        } catch (err) {
          this.onError?.(err, ch.id, event);
        }
      }),
    );
  }

  get size(): number {
    return this.channels.length;
  }
}
