export { singapayProvider } from './adapter';
export type { SingaPayConfig } from './adapter';
export { createSignature, verifySignature, sha256Hex } from './signature';
import type { BetterPayPlugin } from '@betterpay/core';
import { singapayProvider } from './adapter';
import type { SingaPayConfig } from './adapter';
export function singapay(config: SingaPayConfig): BetterPayPlugin {
  return { id:'singapay', version:'0.1.0', providers:[singapayProvider(config)], defaultProvider:'singapay', $ERROR_CODES:{ SINGAPAY_CREATE_ERROR:{code:'SINGAPAY_CREATE_ERROR', message:'Failed to create SingaPay transaction'}, SINGAPAY_STATUS_ERROR:{code:'SINGAPAY_STATUS_ERROR', message:'Failed to check SingaPay status'} } };
}
