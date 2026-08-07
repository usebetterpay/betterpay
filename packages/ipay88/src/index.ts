export { ipay88Provider } from './adapter';
export type { IPay88Config } from './adapter';
export { createSignature, verifySignature, sha256Hex } from './signature';
import type { BetterPayPlugin } from '@betterpay/core';
import { ipay88Provider } from './adapter';
import type { IPay88Config } from './adapter';
export function ipay88(config: IPay88Config): BetterPayPlugin {
  return { id:'ipay88', version:'0.1.0', providers:[ipay88Provider(config)], defaultProvider:'ipay88', $ERROR_CODES:{ IPAY88_CREATE_ERROR:{code:'IPAY88_CREATE_ERROR', message:'Failed to create IPay88 transaction'}, IPAY88_STATUS_ERROR:{code:'IPAY88_STATUS_ERROR', message:'Failed to check IPay88 status'} } };
}
