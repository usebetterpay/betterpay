// Webhook Replay Protection
// Prevents attackers from replaying old webhook payloads

export interface ReplayProtectionOptions {
  /** Maximum age of webhook in milliseconds (default: 5 minutes) */
  maxAge: number;
  /** Clock skew tolerance in milliseconds (default: 30 seconds) */
  clockSkew: number;
}

export const DEFAULT_REPLAY_OPTIONS: ReplayProtectionOptions = {
  maxAge: 5 * 60 * 1000, // 5 minutes
  clockSkew: 30 * 1000, // 30 seconds
};

export interface WebhookTimestamp {
  timestamp: number; // Unix timestamp in seconds
  signature: string;
}

/**
 * Parse timestamp from webhook header.
 * Format: "t=1234567890,v1=signature" (Stripe-style)
 */
export function parseTimestampHeader(header: string): WebhookTimestamp | null {
  const parts = header.split(',');
  let timestamp: number | null = null;
  let signature: string | null = null;

  for (const part of parts) {
    const [key, value] = part.split('=');
    if (key === 't') {
      timestamp = parseInt(value!, 10);
    } else if (key === 'v1') {
      signature = value!;
    }
  }

  if (timestamp === null || signature === null) {
    return null;
  }

  return { timestamp, signature };
}

/**
 * Validate webhook timestamp to prevent replay attacks.
 * Returns true if timestamp is within acceptable window.
 */
export function validateTimestamp(
  webhookTimestamp: number,
  options: Partial<ReplayProtectionOptions> = {},
): { valid: boolean; error?: string } {
  const opts = { ...DEFAULT_REPLAY_OPTIONS, ...options };
  const now = Math.floor(Date.now() / 1000); // Convert to seconds

  // Check for clock skew (timestamp in future)
  if (webhookTimestamp > now + opts.clockSkew / 1000) {
    return {
      valid: false,
      error: `Webhook timestamp is in the future (skew: ${webhookTimestamp - now}s)`,
    };
  }

  // Check for replay (timestamp too old)
  const age = now - webhookTimestamp;
  if (age > opts.maxAge / 1000) {
    return {
      valid: false,
      error: `Webhook timestamp is too old (age: ${age}s, max: ${opts.maxAge / 1000}s)`,
    };
  }

  return { valid: true };
}

/**
 * Create timestamp header for outgoing webhook.
 * Format: "t=1234567890,v1=signature"
 */
export function createTimestampHeader(
  payload: string,
  secret: string,
): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHmacSignature(
    `${timestamp}.${payload}`,
    secret,
  );

  return `t=${timestamp},v1=${signature}`;
}

/**
 * Create HMAC-SHA256 signature.
 */
function createHmacSignature(data: string, secret: string): string {
  // Static import at top would be cleaner; lazy require kept for compat but
  // fall back to WebCrypto-free node:crypto import (ESM-safe).
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  try {
    const { createHmac } = require('node:crypto') as typeof import('node:crypto');
    return createHmac('sha256', secret).update(data, 'utf8').digest('hex');
  } catch {
    return '';
  }
}

/**
 * Validate providerEventId freshness when no timestamp header exists.
 * Most Indonesian gateways don't send x-webhook-timestamp — without this,
 * replay protection is a no-op. Providers that embed epoch ms/s in the event
 * id or payload `createdAt` get a best-effort age check.
 */
export function validateEventFreshness(
  providerEventId: string | undefined,
  payload: Record<string, unknown> | undefined,
  options: Partial<ReplayProtectionOptions> = {},
): { valid: boolean; error?: string } {
  const candidates: number[] = [];
  const pushTs = (v: unknown): void => {
    if (typeof v === 'number' && Number.isFinite(v)) {
      candidates.push(v > 1e12 ? Math.floor(v / 1000) : v > 1e10 ? Math.floor(v / 1000) : v);
    } else if (typeof v === 'string' && /^\d{10,13}$/.test(v)) {
      const n = parseInt(v, 10);
      candidates.push(n > 1e12 ? Math.floor(n / 1000) : n > 1e10 ? Math.floor(n / 1000) : n);
    } else if (typeof v === 'string') {
      const t = Date.parse(v);
      if (!Number.isNaN(t)) candidates.push(Math.floor(t / 1000));
    }
  };
  pushTs(payload?.createdAt);
  pushTs(payload?.created_at);
  pushTs(payload?.timestamp);
  pushTs((payload?.event as Record<string, unknown> | undefined)?.createdAt);
  // providerEventId like `evt_1730000000_xxx`
  const m = providerEventId?.match(/(\d{10,13})/);
  if (m?.[1]) pushTs(m[1]);
  if (candidates.length === 0) return { valid: true };
  for (const ts of candidates) {
    const r = validateTimestamp(ts, options);
    if (!r.valid) return r;
  }
  return { valid: true };
}
