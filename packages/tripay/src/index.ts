export { TripayProvider, type WebhookVerificationResult } from './adapter';
export type {
  TripayConfig,
  TripayPaymentChannel,
  TripayTransactionRequest,
  TripayTransactionResponse,
  TripayCallbackPayload,
  TripayCallbackHeaders,
  TripayOrderItem,
  TripayInstruction,
  TripayTransactionStatus,
} from './types';
export {
  generateTransactionSignature,
  generateOpenPaymentSignature,
  generateCallbackSignature,
  verifyCallbackSignature,
} from './signature';

// ── Plugin factory ────────────────────────────────────────────────────────
import type { BetterPayPlugin } from '@betterpay/core';
import { TripayProvider } from './adapter';
import type { TripayConfig } from './types';

/**
 * Create a Tripay plugin for BetterPay.
 *
 * Usage:
 * ```ts
 * betterPay({
 *   plugins: [tripay({ apiKey: '...', privateKey: '...', merchantCode: '...' })],
 * })
 * ```
 */
export function tripay(config: TripayConfig): BetterPayPlugin {
  const provider = new TripayProvider(config);
  return {
    id: 'tripay',
    version: '0.1.0',
    providers: [provider],
    defaultProvider: 'tripay',
    $ERROR_CODES: {
      TRIPAY_CREATE_ERROR: {
        code: 'TRIPAY_CREATE_ERROR',
        message: 'Failed to create Tripay transaction',
      },
      TRIPAY_STATUS_ERROR: {
        code: 'TRIPAY_STATUS_ERROR',
        message: 'Failed to check Tripay transaction status',
      },
    },
  };
}
