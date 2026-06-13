// ── @betterpay/mayar — Mayar plugin for BetterPay ──────────────────────
export { MayarProvider, mayarProvider } from './adapter';
export type { MayarConfig } from './types';
export { verifyMayarWebhook, parseMayarWebhook } from './signature';

// ── Plugin factory ────────────────────────────────────────────────────────
import type { BetterPayPlugin } from '@betterpay/core';
import { MayarProvider } from './adapter';
import type { MayarConfig } from './types';

/**
 * Create a Mayar plugin for BetterPay.
 *
 * Usage:
 * ```ts
 * betterPay({
 *   plugins: [mayar({ apiKey: '...', merchantId: '...' })],
 * })
 * ```
 */
export function mayar(config: MayarConfig): BetterPayPlugin {
  const provider = new MayarProvider(config);
  return {
    id: 'mayar',
    version: '0.1.0',
    providers: [provider],
    defaultProvider: 'mayar',
    $ERROR_CODES: {
      MAYAR_CREATE_ERROR: {
        code: 'MAYAR_CREATE_ERROR',
        message: 'Failed to create Mayar payment',
      },
      MAYAR_STATUS_ERROR: {
        code: 'MAYAR_STATUS_ERROR',
        message: 'Failed to check Mayar payment status',
      },
    },
  };
}
