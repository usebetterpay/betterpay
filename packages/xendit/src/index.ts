// ── @betterpay/xendit — Xendit plugin for BetterPay ──────────────────────
export { xenditProvider } from './adapter';
export type { XenditConfig } from './adapter';
export { verifyXenditSignature, extractXenditSignature } from './signature';

// ── Plugin factory ────────────────────────────────────────────────────────
import type { BetterPayPlugin } from '@betterpay/core';
import { xenditProvider } from './adapter';
import type { XenditConfig } from './adapter';

/**
 * Create a Xendit plugin for BetterPay.
 *
 * Usage:
 * ```ts
 * betterPay({
 *   plugins: [xendit({ apiKey: '...', webhookSecret: '...' })],
 * })
 * ```
 */
export function xendit(config: XenditConfig): BetterPayPlugin {
  const provider = xenditProvider(config);
  return {
    id: 'xendit',
    version: '0.1.0',
    providers: [provider],
    defaultProvider: 'xendit',
    $ERROR_CODES: {
      XENDIT_CREATE_ERROR: {
        code: 'XENDIT_CREATE_ERROR',
        message: 'Failed to create Xendit transaction',
      },
      XENDIT_STATUS_ERROR: {
        code: 'XENDIT_STATUS_ERROR',
        message: 'Failed to check Xendit transaction status',
      },
    },
  };
}
