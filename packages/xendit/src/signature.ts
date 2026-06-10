// ── Xendit Signature Verification ────────────────────────────────────────
// Extracted from wabase: simple token comparison via x-callback-token header.

import { timingSafeEqual } from 'node:crypto';

/**
 * Verify Xendit webhook signature.
 * Xendit uses a simple webhook token comparison (not HMAC).
 */
export function verifyXenditSignature(
  _payload: string,
  signature: string,
  webhookToken: string,
): boolean {
  if (!signature || !webhookToken) return false;
  if (signature.length !== webhookToken.length) return false;
  return timingSafeEqual(
    Buffer.from(signature, 'utf8'),
    Buffer.from(webhookToken, 'utf8'),
  );
}

/** Extract Xendit callback token from headers. */
export function extractXenditSignature(
  headers: Record<string, string | string[] | undefined>,
): string | undefined {
  const header = headers['x-callback-token'] ?? headers['X-CALLBACK-TOKEN'];
  return Array.isArray(header) ? header[0] : header;
}
