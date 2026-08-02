export { nicepayProvider } from './adapter';
export type { NicepayConfig } from './adapter';
export { sha256Hex, createNicepaySignature, verifyNicepaySignature } from './signature';

import type { BetterPayPlugin } from '@betterpay/core';
import { nicepayProvider } from './adapter';
import type { NicepayConfig } from './adapter';

export function nicepay(config: NicepayConfig): BetterPayPlugin {
  return {
    id: 'nicepay',
    version: '0.1.0',
    providers: [nicepayProvider(config)],
    defaultProvider: 'nicepay',
    $ERROR_CODES: {
      NICEPAY_CREATE_ERROR: { code: 'NICEPAY_CREATE_ERROR', message: 'Failed to create Nicepay transaction' },
      NICEPAY_STATUS_ERROR: { code: 'NICEPAY_STATUS_ERROR', message: 'Failed to check Nicepay transaction status' },
    },
  };
}
