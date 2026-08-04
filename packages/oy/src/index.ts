export { oyProvider } from './adapter';
export type { OyConfig, DisburseInput, DisburseResult } from './adapter';
export { createOyHeaders, verifyOyWebhook, verifyOyIp } from './signature';

import type { BetterPayPlugin } from '@betterpay/core';
import { oyProvider } from './adapter';
import type { OyConfig } from './adapter';

export function oy(config: OyConfig): BetterPayPlugin {
  return {
    id: 'oy',
    version: '0.1.0',
    providers: [oyProvider(config)],
    defaultProvider: 'oy',
    $ERROR_CODES: {
      OY_DISBURSE_ERROR: { code: 'OY_DISBURSE_ERROR', message: 'Failed to create OY! disbursement' },
      OY_STATUS_ERROR: { code: 'OY_STATUS_ERROR', message: 'Failed to check OY! transaction status' },
    },
  };
}
