// ── Pakasir Signature Verification ───────────────────────────────────────
// Extracted from wabase: simple field comparison (project slug match).
// No cryptographic signature — verification by field matching.

/**
 * Verify Pakasir webhook by matching project slug in payload against config.
 */
export function verifyPakasirSignature(
  payload: string,
  _signature: string,
  projectSlug: string,
): boolean {
  if (!payload || !projectSlug) return false;
  try {
    const parsed = JSON.parse(payload) as Record<string, unknown>;
    return parsed.project === projectSlug;
  } catch {
    return false;
  }
}

/** Parse Pakasir JSON webhook payload. */
export function parsePakasirPayload(payload: string): {
  amount: number;
  orderId: string;
  project: string;
  status: string;
} | undefined {
  try {
    const parsed = JSON.parse(payload) as Record<string, unknown>;
    return {
      amount: Number(parsed.amount ?? 0),
      orderId: String(parsed.order_id ?? ''),
      project: String(parsed.project ?? ''),
      status: String(parsed.status ?? ''),
    };
  } catch {
    return undefined;
  }
}
