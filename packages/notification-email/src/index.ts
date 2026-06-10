// ── @betterpay/notification-email — Email notification plugin scaffold ───
//
// This plugin fires on billing events and sends email notifications.
// Supports: Resend, SendGrid, SMTP (via nodemailer).
//
// Usage:
//   import { notificationEmail } from "@betterpay/notification-email";
//
//   betterPay({
//     plugins: [
//       notificationEmail({
//         provider: "resend",
//         apiKey: process.env.RESEND_API_KEY!,
//         from: "billing@myapp.com",
//       }),
//     ],
//   });

import type { BetterPayPlugin } from '@betterpay/core';

export type EmailProvider = 'resend' | 'sendgrid' | 'smtp';

export interface NotificationEmailConfig {
  provider: EmailProvider;
  apiKey?: string;
  from: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPassword?: string;
}

export function notificationEmail(config: NotificationEmailConfig): BetterPayPlugin {
  return {
    id: 'notification-email',
    version: '0.1.0',
    $Infer: { emailConfig: config },
    $ERROR_CODES: {
      EMAIL_SEND_ERROR: {
        code: 'EMAIL_SEND_ERROR',
        message: 'Failed to send email notification',
      },
    },
  };
}
