// ── @betterpay/pakasir — Pakasir plugin for BetterPay ────────────────────
export { pakasirProvider } from './adapter';
export type { PakasirConfig } from './adapter';
export { verifyPakasirSignature, parsePakasirPayload } from './signature';

import type { BetterPayPlugin } from '@betterpay/core';
import { pakasirProvider } from './adapter';
import type { PakasirConfig } from './adapter';

/**
 * Create a Pakasir plugin for BetterPay.
 *
 * Usage:
 * ```ts
 * betterPay({
 *   plugins: [pakasir({ apiKey: '...', projectSlug: 'my-app' })],
 * })
 * ```
 */
export function pakasir(config: PakasirConfig): BetterPayPlugin {
  const provider = pakasirProvider(config);
  return {
    id: 'pakasir',
    version: '0.1.0',
    providers: [provider],
    defaultProvider: 'pakasir',
    $ERROR_CODES: {
      PAKASIR_CREATE_ERROR: {
        code: 'PAKASIR_CREATE_ERROR',
        message: 'Failed to create Pakasir transaction',
      },
      PAKASIR_STATUS_ERROR: {
        code: 'PAKASIR_STATUS_ERROR',
        message: 'Failed to check Pakasir transaction status',
      },
    },
  };
}
