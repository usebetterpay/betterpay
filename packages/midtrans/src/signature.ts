// ── Midtrans Signature Verification ──────────────────────────────────────
// Extracted from wabase: SHA512(order_id + status_code + gross_amount + serverKey)

import { createHash, timingSafeEqual } from 'node:crypto';

function sha512Hex(data: string): string {
  return createHash('sha512').update(data, 'utf8').digest('hex');
}

/**
 * Verify Midtrans webhook signature.
 * The signature_key is included IN the JSON body (not in headers).
 */
export function verifyMidtransSignature(
  payload: string,
  signature: string,
  serverKey: string,
): boolean {
  if (!payload || !signature || !serverKey) return false;
  try {
    const parsed = JSON.parse(payload) as Record<string, string>;
    const orderId = parsed.order_id ?? '';
    const statusCode = parsed.status_code ?? '';
    const grossAmount = parsed.gross_amount ?? '';

    const expected = sha512Hex(`${orderId}${statusCode}${grossAmount}${serverKey}`);
    return timingSafeEqual(
      Buffer.from(signature.toLowerCase(), 'utf8'),
      Buffer.from(expected.toLowerCase(), 'utf8'),
    );
  } catch {
    return false;
  }
}

/** Extract signature_key from Midtrans JSON payload. */
export function extractMidtransSignature(payload: string): string | undefined {
  try {
    return (JSON.parse(payload) as Record<string, string>).signature_key;
  } catch {
    return undefined;
  }
}
