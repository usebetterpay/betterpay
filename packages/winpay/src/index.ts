export { winpayProvider } from './adapter';
export type { WinpayConfig } from './adapter';
export { sha256Hex, createWinpaySignature, verifyWinpaySignature, verifyWinpayWebhook } from './signature';

import type { BetterPayPlugin } from '@betterpay/core';
import { winpayProvider } from './adapter';
import type { WinpayConfig } from './adapter';

export function winpay(config: WinpayConfig): BetterPayPlugin {
  return {
    id: 'winpay',
    version: '0.1.0',
    providers: [winpayProvider(config)],
    defaultProvider: 'winpay',
    $ERROR_CODES: {
      WINPAY_CREATE_ERROR: { code: 'WINPAY_CREATE_ERROR', message: 'Failed to create Winpay transaction' },
      WINPAY_STATUS_ERROR: { code: 'WINPAY_STATUS_ERROR', message: 'Failed to check Winpay transaction status' },
    },
  };
}
