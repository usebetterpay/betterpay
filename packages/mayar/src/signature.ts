// ── Mayar Webhook Verification ─────────────────────────────────────────────
// Mayar does NOT use HMAC/signature headers for webhooks.
// Verification is done by checking data.merchantId against known merchant ID.
//
// ⚠️  Security note: This is trust-based verification. For production,
//    consider whitelisting Mayar's IP ranges in your firewall/load balancer.

import type { MayarWebhookPayload } from './types';

/**
 * Verify a Mayar webhook by checking the merchantId in the payload
 * against the expected merchant ID from config.
 *
 * @param payload - Raw webhook body string
 * @param expectedMerchantId - Your Mayar merchant ID
 * @returns true if merchantId matches
 */
export function verifyMayarWebhook(payload: string, expectedMerchantId: string): boolean {
  if (!payload || !expectedMerchantId) return false;

  try {
    const parsed: MayarWebhookPayload = JSON.parse(payload);
    return parsed.data?.merchantId === expectedMerchantId;
  } catch {
    return false;
  }
}

/**
 * Parse a Mayar webhook payload string.
 */
export function parseMayarWebhook(payload: string): MayarWebhookPayload {
  return JSON.parse(payload) as MayarWebhookPayload;
}
