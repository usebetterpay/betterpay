// ── Duitku Signature Verification ────────────────────────────────────────
// Create/status: HMAC-SHA256(message, apiKey)
// Callback body: form-urlencoded (NOT JSON)
// Callback sig:  HMAC-SHA256(merchantCode + amount + merchantOrderId, apiKey)

import { createHmac, timingSafeEqual } from 'node:crypto';

function hmacSha256Hex(message: string, apiKey: string): string {
  return createHmac('sha256', apiKey).update(message, 'utf8').digest('hex');
}

function ctEqualHex(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a.toLowerCase(), 'utf8');
    const bb = Buffer.from(b.toLowerCase(), 'utf8');
    if (ba.length !== bb.length) return false;
    if (ba.length === 0) return true;
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

/** Inquiry: HMAC_SHA256(merchantCode + merchantOrderId + paymentAmount, apiKey) */
export function signDuitkuInquiry(
  merchantCode: string,
  merchantOrderId: string,
  paymentAmount: number | string,
  apiKey: string,
): string {
  return hmacSha256Hex(`${merchantCode}${merchantOrderId}${paymentAmount}`, apiKey);
}

/** Status check: HMAC_SHA256(merchantCode + merchantOrderId, apiKey) */
export function signDuitkuStatus(
  merchantCode: string,
  merchantOrderId: string,
  apiKey: string,
): string {
  return hmacSha256Hex(`${merchantCode}${merchantOrderId}`, apiKey);
}

/**
 * Verify Duitku callback signature.
 * Signature = HMAC_SHA256(merchantCode + amount + merchantOrderId, apiKey)
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
    const expected = hmacSha256Hex(`${merchantCode}${amount}${merchantOrderId}`, apiKey);
    return ctEqualHex(signature, expected);
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
