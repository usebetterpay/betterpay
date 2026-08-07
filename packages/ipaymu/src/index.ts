export { ipaymuProvider } from './adapter';
export type { iPaymuConfig } from './adapter';
export { createSignature, verifySignature, sha256Hex } from './signature';
import type { BetterPayPlugin } from '@betterpay/core';
import { ipaymuProvider } from './adapter';
import type { iPaymuConfig } from './adapter';
export function ipaymu(config: iPaymuConfig): BetterPayPlugin {
  return { id:'ipaymu', version:'0.1.0', providers:[ipaymuProvider(config)], defaultProvider:'ipaymu', $ERROR_CODES:{ IPAYMU_CREATE_ERROR:{code:'IPAYMU_CREATE_ERROR', message:'Failed to create iPaymu transaction'}, IPAYMU_STATUS_ERROR:{code:'IPAYMU_STATUS_ERROR', message:'Failed to check iPaymu status'} } };
}
