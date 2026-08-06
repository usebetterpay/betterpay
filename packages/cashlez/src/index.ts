export { cashlezProvider } from './adapter';
export type { CashlezConfig } from './adapter';
export { createSignature, verifySignature, sha256Hex } from './signature';
import type { BetterPayPlugin } from '@betterpay/core';
import { cashlezProvider } from './adapter';
import type { CashlezConfig } from './adapter';
export function cashlez(config: CashlezConfig): BetterPayPlugin {
  return { id:'cashlez', version:'0.1.0', providers:[cashlezProvider(config)], defaultProvider:'cashlez', $ERROR_CODES:{ CASHLEZ_CREATE_ERROR:{code:'CASHLEZ_CREATE_ERROR', message:'Failed to create Cashlez transaction'}, CASHLEZ_STATUS_ERROR:{code:'CASHLEZ_STATUS_ERROR', message:'Failed to check Cashlez status'} } };
}
