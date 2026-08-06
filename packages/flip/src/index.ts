export { flipProvider } from './adapter';
export type { FlipConfig } from './adapter';
export { createSignature, verifySignature, sha256Hex } from './signature';
import type { BetterPayPlugin } from '@betterpay/core';
import { flipProvider } from './adapter';
import type { FlipConfig } from './adapter';
export function flip(config: FlipConfig): BetterPayPlugin {
  return { id:'flip', version:'0.1.0', providers:[flipProvider(config)], defaultProvider:'flip', $ERROR_CODES:{ FLIP_CREATE_ERROR:{code:'FLIP_CREATE_ERROR', message:'Failed to create Flip transaction'}, FLIP_STATUS_ERROR:{code:'FLIP_STATUS_ERROR', message:'Failed to check Flip status'} } };
}
