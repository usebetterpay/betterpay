export { espayProvider } from './adapter';
export type { EspayConfig } from './adapter';
export { sha256Hex, createEspayAsymmetricSignature, verifyEspayAsymmetricSignature, createEspayHashSignature, verifyEspayHashSignatureSync } from './signature';

import type { BetterPayPlugin } from '@betterpay/core';
import { espayProvider } from './adapter';
import type { EspayConfig } from './adapter';

export function espay(config: EspayConfig): BetterPayPlugin {
  return {
    id: 'espay',
    version: '0.1.0',
    providers: [espayProvider(config)],
    defaultProvider: 'espay',
    $ERROR_CODES: {
      ESPAY_CREATE_ERROR: { code: 'ESPAY_CREATE_ERROR', message: 'Failed to create Espay transaction' },
      ESPAY_STATUS_ERROR: { code: 'ESPAY_STATUS_ERROR', message: 'Failed to check Espay transaction status' },
    },
  };
}
