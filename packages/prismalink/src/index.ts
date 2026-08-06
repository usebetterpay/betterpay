export { prismalinkProvider } from './adapter';
export type { PrismalinkConfig } from './adapter';
export { createSignature, verifySignature, sha256Hex } from './signature';
import type { BetterPayPlugin } from '@betterpay/core';
import { prismalinkProvider } from './adapter';
import type { PrismalinkConfig } from './adapter';
export function prismalink(config: PrismalinkConfig): BetterPayPlugin {
  return { id:'prismalink', version:'0.1.0', providers:[prismalinkProvider(config)], defaultProvider:'prismalink', $ERROR_CODES:{ PRISMALINK_CREATE_ERROR:{code:'PRISMALINK_CREATE_ERROR', message:'Failed to create Prismalink transaction'}, PRISMALINK_STATUS_ERROR:{code:'PRISMALINK_STATUS_ERROR', message:'Failed to check Prismalink status'} } };
}
