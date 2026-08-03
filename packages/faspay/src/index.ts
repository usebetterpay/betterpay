export { faspayProvider } from './adapter';
export type { FaspayConfig } from './adapter';
export { sha256Hex, createFaspayHashSignature, verifyFaspayHashSignature, createFaspaySnapSignature, verifyFaspaySnapSignature } from './signature';

import type { BetterPayPlugin } from '@betterpay/core';
import { faspayProvider } from './adapter';
import type { FaspayConfig } from './adapter';

export function faspay(config: FaspayConfig): BetterPayPlugin {
  return {
    id: 'faspay',
    version: '0.1.0',
    providers: [faspayProvider(config)],
    defaultProvider: 'faspay',
    $ERROR_CODES: {
      FASPAY_CREATE_ERROR: { code: 'FASPAY_CREATE_ERROR', message: 'Failed to create Faspay transaction' },
      FASPAY_STATUS_ERROR: { code: 'FASPAY_STATUS_ERROR', message: 'Failed to check Faspay transaction status' },
    },
  };
}
