// ── Duitku Signature Verification ────────────────────────────────────────
// Extracted from wabase: SHA256(merchantCode + amount + merchantOrderId + apiKey)
// Duitku sends webhooks as form-urlencoded, NOT JSON.

import { createHash, timingSafeEqual } from 'node:crypto';

function sha256Hex(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex');
}

/**
 * Verify Duitku webhook signature.
 * Signature = SHA256(merchantCode + amount + merchantOrderId + apiKey)
 * The signature is included IN the form-urlencoded payload.
 */
export function verifyDuitkuSignature(
  payload: string,
  signature: string,
  apiKey: string,
): boolean {
  if (!payload || !signature || !apiKey) return false;

  try {
    const params = new URLSearchParams(payload);
    const merchantCode = params.get('merchantCode') ?? '';
    const amount = params.get('amount') ?? '';
    const merchantOrderId = params.get('merchantOrderId') ?? '';

    const expected = sha256Hex(`${merchantCode}${amount}${merchantOrderId}${apiKey}`);
    return timingSafeEqual(
      Buffer.from(signature.toLowerCase(), 'utf8'),
      Buffer.from(expected.toLowerCase(), 'utf8'),
    );
  } catch {
    return false;
  }
}

/** Extract signature from Duitku form-urlencoded payload. */
export function extractDuitkuSignature(payload: string): string | undefined {
  try {
    const params = new URLSearchParams(payload);
    return params.get('signature') ?? undefined;
  } catch {
    return undefined;
  }
}

/** Parse Duitku form-urlencoded webhook payload. */
export function parseDuitkuPayload(payload: string): {
  merchantCode: string;
  amount: number;
  merchantOrderId: string;
  resultCode: string;
  reference: string;
} | undefined {
  if (!payload || typeof payload !== 'string') return undefined;
  try {
    const params = new URLSearchParams(payload);
    return {
      merchantCode: params.get('merchantCode') ?? '',
      amount: Number(params.get('amount') ?? 0),
      merchantOrderId: params.get('merchantOrderId') ?? '',
      resultCode: params.get('resultCode') ?? '',
      reference: params.get('reference') ?? '',
    };
  } catch {
    return undefined;
  }
}
