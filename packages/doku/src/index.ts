export { dokuProvider } from './adapter';
export type { DokuConfig } from './adapter';
export { DokuTokenClient } from './token';
export type { DokuTokenClientOptions, DokuTokenResponse } from './token';
export {
  sha256Hex,
  createDokuTokenSignature,
  createDokuTransactionSignature,
  createDokuSymmetricSignature,
  verifyDokuWebhook,
} from './signature';

import type { BetterPayPlugin } from '@betterpay/core';
import { dokuProvider } from './adapter';
import type { DokuConfig } from './adapter';

export function doku(config: DokuConfig): BetterPayPlugin {
  return {
    id: 'doku', version: '0.1.0', providers: [dokuProvider(config)], defaultProvider: 'doku',
    $ERROR_CODES: {
      DOKU_CREATE_ERROR: { code: 'DOKU_CREATE_ERROR', message: 'Failed to create DOKU transaction' },
      DOKU_STATUS_ERROR: { code: 'DOKU_STATUS_ERROR', message: 'Failed to check DOKU transaction status' },
    },
  };
}
