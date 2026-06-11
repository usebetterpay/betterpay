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
  const crypto = require('crypto');
  return crypto
    .createHmac('sha256', secret)
    .update(data, 'utf8')
    .digest('hex');
}
