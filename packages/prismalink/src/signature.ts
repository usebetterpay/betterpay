// Re-export shared timing-safe HMAC helpers from @betterpay/core.
// Keeps gateway-specific API stable while fixing xor-loop timing leak.
export {
  hmacMerchantOrder as createSignature,
  verifyHmacMerchantOrder as verifySignature,
} from '@betterpay/core';
export { safeEqual } from '@betterpay/core';
import { createHash } from 'node:crypto';
function minifyJson(body: string): string { try { return JSON.stringify(JSON.parse(body)); } catch { return body; } }
export function sha256Hex(body: string): string { return createHash('sha256').update(minifyJson(body),'utf8').digest('hex').toLowerCase(); }
