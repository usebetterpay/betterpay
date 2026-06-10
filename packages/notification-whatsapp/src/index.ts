// ── @betterpay/notification-whatsapp — WhatsApp notification plugin ──────
//
// Supports Indonesian WhatsApp API providers: Fonnte, Wablas, Twilio.
//
// Usage:
//   import { notificationWhatsapp } from "@betterpay/notification-whatsapp";
//
//   betterPay({
//     plugins: [
//       notificationWhatsapp({
//         provider: "fonnte",
//         apiKey: process.env.FONNTE_API_KEY!,
//       }),
//     ],
//   });

import type { BetterPayPlugin } from '@betterpay/core';

export type WhatsappProvider = 'fonnte' | 'wablas' | 'twilio';

export interface NotificationWhatsappConfig {
  provider: WhatsappProvider;
  apiKey: string;
  fromNumber?: string;
}

export function notificationWhatsapp(config: NotificationWhatsappConfig): BetterPayPlugin {
  return {
    id: 'notification-whatsapp',
    version: '0.1.0',
    $Infer: { whatsappConfig: config },
    $ERROR_CODES: {
      WHATSAPP_SEND_ERROR: {
        code: 'WHATSAPP_SEND_ERROR',
        message: 'Failed to send WhatsApp notification',
      },
    },
  };
}
