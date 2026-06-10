// ── @betterpay/midtrans — Midtrans plugin for BetterPay ──────────────────
export { midtransProvider } from './adapter';
export type { MidtransConfig } from './adapter';
export { verifyMidtransSignature, extractMidtransSignature } from './signature';

// ── Plugin factory ────────────────────────────────────────────────────────
import type { BetterPayPlugin } from '@betterpay/core';
import { midtransProvider } from './adapter';
import type { MidtransConfig } from './adapter';

/**
 * Create a Midtrans plugin for BetterPay.
 *
 * Usage:
 * ```ts
 * betterPay({
 *   plugins: [midtrans({ serverKey: '...', isSandbox: true })],
 * })
 * ```
 */
export function midtrans(config: MidtransConfig): BetterPayPlugin {
  const provider = midtransProvider(config);
  return {
    id: 'midtrans',
    version: '0.1.0',
    providers: [provider],
    defaultProvider: 'midtrans',
    $ERROR_CODES: {
      MIDTRANS_CREATE_ERROR: {
        code: 'MIDTRANS_CREATE_ERROR',
        message: 'Failed to create Midtrans transaction',
      },
      MIDTRANS_STATUS_ERROR: {
        code: 'MIDTRANS_STATUS_ERROR',
        message: 'Failed to check Midtrans transaction status',
      },
    },
  };
}
