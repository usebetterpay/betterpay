// ── @betterpay/notification-whatsapp — Fonnte channel ────────────────────
//
// Usage:
//   import { notificationWhatsapp } from "@betterpay/notification-whatsapp";
//
//   betterPay({
//     plugins: [
//       notificationWhatsapp({
//         provider: "fonnte",
//         apiKey: process.env.FONNTE_TOKEN!,
//       }),
//     ],
//   });

import type { BetterPayPlugin, NotificationChannel, NotificationEvent } from '@betterpay/core';

export type WhatsappProvider = 'fonnte';

export interface NotificationWhatsappConfig {
  /** Only Fonnte is implemented. */
  provider?: WhatsappProvider;
  /** Fonnte device token (Authorization header). */
  apiKey: string;
  /**
   * Default destination when event has no customerPhone.
   * Prefer setting customerPhone on NotificationEvent.
   */
  defaultTarget?: string;
  /** Country code prefix for local numbers (default 62). */
  countryCode?: string;
  fetch?: typeof globalThis.fetch;
  /** Default https://api.fonnte.com */
  apiBase?: string;
}

function messageFor(event: NotificationEvent): string {
  const lines = [
    `BetterPay: ${event.name}`,
    ...Object.entries(event.payload).map(([k, v]) => `${k}: ${String(v)}`),
  ];
  return lines.join('\n');
}

/** Normalize ID phones: 08… → 628…, strip non-digits. */
export function normalizePhone(phone: string, countryCode = '62'): string {
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0')) {
    digits = countryCode + digits.slice(1);
  }
  if (!digits.startsWith(countryCode) && digits.length <= 12) {
    // already missing country code
    digits = countryCode + digits.replace(/^0+/, '');
  }
  return digits;
}

export function createFonnteChannel(config: NotificationWhatsappConfig): NotificationChannel {
  const fetchFn = config.fetch ?? globalThis.fetch;
  const apiBase = (config.apiBase ?? 'https://api.fonnte.com').replace(/\/$/, '');
  const countryCode = config.countryCode ?? '62';

  return {
    id: 'whatsapp-fonnte',
    async send(event: NotificationEvent) {
      const raw = event.customerPhone ?? config.defaultTarget;
      if (!raw) return;

      const target = normalizePhone(raw, countryCode);
      const body = new URLSearchParams();
      body.set('target', target);
      body.set('message', messageFor(event));

      const res = await fetchFn(`${apiBase}/send`, {
        method: 'POST',
        headers: {
          Authorization: config.apiKey,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Fonnte send failed ${res.status}: ${text}`);
      }

      // Fonnte returns 200 with JSON { status: false } on logical errors
      const contentType = res.headers.get('content-type') ?? '';
      if (contentType.includes('application/json')) {
        const data = (await res.json().catch(() => null)) as { status?: boolean; reason?: string } | null;
        if (data && data.status === false) {
          throw new Error(`Fonnte send rejected: ${data.reason ?? 'unknown'}`);
        }
      }
    },
  };
}

/**
 * WhatsApp notification plugin (Fonnte).
 */
export function notificationWhatsapp(config: NotificationWhatsappConfig): BetterPayPlugin {
  if (!config.apiKey) {
    throw new Error('notificationWhatsapp: apiKey is required');
  }

  const channel = createFonnteChannel({
    ...config,
    provider: 'fonnte',
  });

  return {
    id: 'notification-whatsapp',
    version: '0.1.0',
    notificationChannels: [channel],
    $Infer: {
      whatsappConfig: { provider: 'fonnte' as const },
    },
    $ERROR_CODES: {
      WHATSAPP_SEND_ERROR: {
        code: 'WHATSAPP_SEND_ERROR',
        message: 'Failed to send WhatsApp notification',
      },
    },
  };
}
