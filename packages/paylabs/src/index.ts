export { paylabsProvider } from './adapter';
export type { PaylabsConfig } from './adapter';
export { createSignature, verifySignature, sha256Hex } from './signature';
import type { BetterPayPlugin } from '@betterpay/core';
import { paylabsProvider } from './adapter';
import type { PaylabsConfig } from './adapter';
export function paylabs(config: PaylabsConfig): BetterPayPlugin {
  return { id:'paylabs', version:'0.1.0', providers:[paylabsProvider(config)], defaultProvider:'paylabs', $ERROR_CODES:{ PAYLABS_CREATE_ERROR:{code:'PAYLABS_CREATE_ERROR', message:'Failed to create Paylabs transaction'}, PAYLABS_STATUS_ERROR:{code:'PAYLABS_STATUS_ERROR', message:'Failed to check Paylabs status'} } };
}
