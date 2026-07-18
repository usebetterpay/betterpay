// ── @betterpay/duitku — Duitku plugin for BetterPay ──────────────────────
export { duitkuProvider } from './adapter';
export type { DuitkuConfig } from './adapter';
export {
  verifyDuitkuSignature,
  extractDuitkuSignature,
  parseDuitkuPayload,
  signDuitkuInquiry,
  signDuitkuStatus,
} from './signature';

import type { BetterPayPlugin } from '@betterpay/core';
import { duitkuProvider } from './adapter';
import type { DuitkuConfig } from './adapter';

/**
 * Create a Duitku plugin for BetterPay.
 *
 * @example
 * ```ts
 * import { betterPay } from '@betterpay/core';
 * import { duitku } from '@betterpay/duitku';
 *
 * const pay = betterPay({
 *   plugins: [duitku({
 *     apiKey: process.env.DUITKU_API_KEY!,
 *     merchantCode: process.env.DUITKU_MERCHANT_CODE!,
 *     isSandbox: true,
 *   })],
 * });
 * ```
 */
export function duitku(config: DuitkuConfig): BetterPayPlugin {
  const provider = duitkuProvider(config);
  return {
    id: 'duitku',
    version: '0.1.0',
    providers: [provider],
    defaultProvider: 'duitku',
    $ERROR_CODES: {
      DUITKU_CREATE_ERROR: {
        code: 'DUITKU_CREATE_ERROR',
        message: 'Failed to create Duitku transaction',
      },
      DUITKU_STATUS_ERROR: {
        code: 'DUITKU_STATUS_ERROR',
        message: 'Failed to check Duitku transaction status',
      },
    },
  };
}
