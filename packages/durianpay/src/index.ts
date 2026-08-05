export { durianpayProvider } from './adapter';
export type { DurianpayConfig } from './adapter';
export { createSignature, verifySignature, sha256Hex } from './signature';
import type { BetterPayPlugin } from '@betterpay/core';
import { durianpayProvider } from './adapter';
import type { DurianpayConfig } from './adapter';
export function durianpay(config: DurianpayConfig): BetterPayPlugin {
  return { id:'durianpay', version:'0.1.0', providers:[durianpayProvider(config)], defaultProvider:'durianpay', $ERROR_CODES:{ DURIANPAY_CREATE_ERROR:{code:'DURIANPAY_CREATE_ERROR', message:'Failed to create Durianpay transaction'}, DURIANPAY_STATUS_ERROR:{code:'DURIANPAY_STATUS_ERROR', message:'Failed to check Durianpay status'} } };
}
