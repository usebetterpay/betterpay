export { finpayProvider } from './adapter';
export type { FinpayConfig } from './adapter';
export { createSignature, verifySignature, sha256Hex } from './signature';
import type { BetterPayPlugin } from '@betterpay/core';
import { finpayProvider } from './adapter';
import type { FinpayConfig } from './adapter';
export function finpay(config: FinpayConfig): BetterPayPlugin {
  return { id:'finpay', version:'0.1.0', providers:[finpayProvider(config)], defaultProvider:'finpay', $ERROR_CODES:{ FINPAY_CREATE_ERROR:{code:'FINPAY_CREATE_ERROR', message:'Failed to create Finpay transaction'}, FINPAY_STATUS_ERROR:{code:'FINPAY_STATUS_ERROR', message:'Failed to check Finpay status'} } };
}
