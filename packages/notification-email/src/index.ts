// ── @betterpay/notification-email — Resend email channel ─────────────────
//
// Usage:
//   import { notificationEmail } from "@betterpay/notification-email";
//
//   betterPay({
//     plugins: [
//       notificationEmail({
//         apiKey: process.env.RESEND_API_KEY!,
//         from: "billing@myapp.com",
//       }),
//     ],
//   });

import type { BetterPayPlugin, NotificationChannel, NotificationEvent } from '@betterpay/core';

export type EmailProvider = 'resend';

export interface NotificationEmailConfig {
  /** Only Resend is implemented. */
  provider?: EmailProvider;
  apiKey: string;
  from: string;
  /** Override fetch (tests). */
  fetch?: typeof globalThis.fetch;
  /** Resend API base (default https://api.resend.com). */
  apiBase?: string;
}

function subjectFor(event: NotificationEvent): string {
  switch (event.name) {
    case 'invoice.created':
      return 'Invoice created';
    case 'payment.failed':
      return 'Payment failed';
    case 'subscription.canceled':
      return 'Subscription canceled';
    case 'transaction.completed':
      return 'Payment received';
    default:
      return `BetterPay: ${event.name}`;
  }
}

function bodyFor(event: NotificationEvent): string {
  const lines = [
    `Event: ${event.name}`,
    ...Object.entries(event.payload).map(([k, v]) => `${k}: ${String(v)}`),
  ];
  return lines.join('\n');
}

export function createResendChannel(config: NotificationEmailConfig): NotificationChannel {
  const fetchFn = config.fetch ?? globalThis.fetch;
  const apiBase = (config.apiBase ?? 'https://api.resend.com').replace(/\/$/, '');

  return {
    id: 'email-resend',
    async send(event: NotificationEvent) {
      const to = event.customerEmail;
      if (!to) return; // nothing to send

      const res = await fetchFn(`${apiBase}/emails`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: config.from,
          to: [to],
          subject: subjectFor(event),
          text: bodyFor(event),
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Resend email failed ${res.status}: ${text}`);
      }
    },
  };
}

/**
 * Email notification plugin (Resend).
 * Registers a NotificationChannel collected by betterPay().
 */
export function notificationEmail(config: NotificationEmailConfig): BetterPayPlugin {
  if (!config.apiKey) {
    throw new Error('notificationEmail: apiKey is required');
  }
  if (!config.from) {
    throw new Error('notificationEmail: from is required');
  }

  const channel = createResendChannel(config);

  return {
    id: 'notification-email',
    version: '0.1.0',
    notificationChannels: [channel],
    $Infer: { emailConfig: { provider: 'resend' as const, from: config.from } },
    $ERROR_CODES: {
      EMAIL_SEND_ERROR: {
        code: 'EMAIL_SEND_ERROR',
        message: 'Failed to send email notification',
      },
    },
  };
}
