// ── @betterpay/sumopod — SumoPod plugin for BetterPay ────────────────────

export { SumopodProvider, sumopodProvider } from './adapter';
export type {
  SumopodConfig,
  SumopodCreatePaymentRequest,
  SumopodCreatePaymentResponse,
  SumopodWebhookPayload,
} from './types';
export {
  verifySumopodSignature,
  verifySumopodToken,
  verifySumopodWebhook,
  parseSumopodWebhook,
  sanitizeOrderId,
} from './signature';

import type { BetterPayPlugin } from '@betterpay/core';
import { SumopodProvider } from './adapter';
import type { SumopodConfig } from './types';

/**
 * Create a SumoPod plugin for BetterPay.
 *
 * @example
 * ```ts
 * import { betterPay } from '@betterpay/core';
 * import { sumopod } from '@betterpay/sumopod';
 *
 * const pay = betterPay({
 *   plugins: [
 *     sumopod({
 *       apiKey: process.env.SUMOPOD_API_KEY!,
 *       webhookSecret: process.env.SUMOPOD_WEBHOOK_SECRET, // whsec_…
 *       // or webhookToken: process.env.SUMOPOD_WEBHOOK_TOKEN, // whtok_…
 *       isSandbox: true,
 *     }),
 *   ],
 * });
 * ```
 */
export function sumopod(config: SumopodConfig): BetterPayPlugin {
  const provider = new SumopodProvider(config);
  return {
    id: 'sumopod',
    version: '0.1.0',
    providers: [provider],
    defaultProvider: 'sumopod',
    $ERROR_CODES: {
      SUMOPOD_CREATE_ERROR: {
        code: 'SUMOPOD_CREATE_ERROR',
        message: 'Failed to create SumoPod payment',
      },
      SUMOPOD_WEBHOOK_ERROR: {
        code: 'SUMOPOD_WEBHOOK_ERROR',
        message: 'Failed to verify or process SumoPod webhook',
      },
    },
  };
}
