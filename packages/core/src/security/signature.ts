// Shared webhook signature helpers — use everywhere, don't hand-roll xor loops.
import { createHmac, timingSafeEqual } from 'node:crypto';

/** Constant-time string comparison (hex or utf8). */
export function safeEqual(a: string, b: string): boolean {
  if (!a || !b) return false;
  const ab = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/** HMAC-SHA256 hex of `${merchantId}${orderId}${amount}` — shared by SME gateways. */
export function hmacMerchantOrder(
  merchantId: string,
  orderId: string,
  amount: number | string,
  secret: string,
): string {
  return createHmac('sha256', secret)
    .update(`${merchantId}${orderId}${amount}`, 'utf8')
    .digest('hex');
}

/** Verify `hmacMerchantOrder` with constant-time compare. */
export function verifyHmacMerchantOrder(
  merchantId: string,
  orderId: string,
  amount: number | string,
  signature: string,
  secret: string,
): boolean {
  if (!signature || !secret) return false;
  const expected = hmacMerchantOrder(merchantId, orderId, amount, secret);
  return safeEqual(signature.toLowerCase(), expected.toLowerCase());
}
