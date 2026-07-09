// ── SumoPod webhook verification (Svix HMAC + token) ─────────────────────

import { createHmac, timingSafeEqual } from 'node:crypto';
import type { SumopodWebhookPayload } from './types';

function header(
  headers: Record<string, string>,
  name: string,
): string | undefined {
  const lower = name.toLowerCase();
  for (const [k, v] of Object.entries(headers)) {
    if (k.toLowerCase() === lower) return v;
  }
  return undefined;
}

function constantTimeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ba.length !== bb.length) {
    const dummy = Buffer.alloc(Math.max(ba.length, bb.length, 1));
    timingSafeEqual(dummy, dummy);
    return false;
  }
  if (ba.length === 0) return true;
  return timingSafeEqual(ba, bb);
}

/**
 * Verify Svix-style webhook signature.
 * `svix-signature` may contain multiple space-separated `v1,<sig>` values.
 */
export function verifySumopodSignature(
  secret: string,
  svixId: string,
  svixTimestamp: string,
  svixSignature: string,
  rawBody: string,
): boolean {
  if (!secret || !svixId || !svixTimestamp || !svixSignature) return false;

  let secretBytes: Buffer;
  try {
    const b64 = secret.startsWith('whsec_') ? secret.slice('whsec_'.length) : secret;
    secretBytes = Buffer.from(b64, 'base64');
    if (secretBytes.length === 0) return false;
  } catch {
    return false;
  }

  const signedContent = `${svixId}.${svixTimestamp}.${rawBody}`;
  const expected = createHmac('sha256', secretBytes)
    .update(signedContent, 'utf8')
    .digest('base64');

  const candidates = svixSignature
    .split(' ')
    .map((part) => {
      const comma = part.indexOf(',');
      return comma >= 0 ? part.slice(comma + 1) : part;
    })
    .filter(Boolean);

  return candidates.some((sig) => constantTimeEqual(sig, expected));
}

/** Compare `X-Webhook-Token` to configured token (constant-time). */
export function verifySumopodToken(
  expectedToken: string | undefined,
  receivedToken: string | undefined,
): boolean {
  if (!expectedToken || !receivedToken) return false;
  return constantTimeEqual(expectedToken, receivedToken);
}

/**
 * Full webhook auth: prefer Svix HMAC when secret configured, else token.
 * Returns false if neither secret nor token is configured.
 */
export function verifySumopodWebhook(
  rawBody: string,
  headers: Record<string, string>,
  opts: {
    webhookSecret?: string;
    webhookToken?: string;
    /** Max |now - svix-timestamp| in seconds; 0 disables. Default 300. */
    toleranceSeconds?: number;
  },
): boolean {
  const secret = opts.webhookSecret;
  const token = opts.webhookToken;

  if (secret) {
    const id = header(headers, 'svix-id');
    const ts = header(headers, 'svix-timestamp');
    const sig = header(headers, 'svix-signature');
    if (!id || !ts || !sig) return false;

    const tolerance = opts.toleranceSeconds ?? 300;
    if (tolerance > 0) {
      const tsNum = Number(ts);
      if (!Number.isFinite(tsNum)) return false;
      // svix timestamp is unix seconds
      const age = Math.abs(Math.floor(Date.now() / 1000) - tsNum);
      if (age > tolerance) return false;
    }

    return verifySumopodSignature(secret, id, ts, sig, rawBody);
  }

  if (token) {
    const received = header(headers, 'x-webhook-token');
    return verifySumopodToken(token, received);
  }

  return false;
}

export function parseSumopodWebhook(body: string): SumopodWebhookPayload {
  const parsed = JSON.parse(body) as SumopodWebhookPayload;
  if (!parsed || typeof parsed.event_type !== 'string' || !parsed.data) {
    throw new Error('Invalid SumoPod webhook payload');
  }
  return parsed;
}

/** Sanitize order id for SumoPod: `[a-zA-Z0-9-_]+`, max 64. */
export function sanitizeOrderId(orderId: string): string {
  const cleaned = orderId.replace(/[^a-zA-Z0-9-_]/g, '-').replace(/-+/g, '-').slice(0, 64);
  if (!cleaned) {
    throw new Error('SumoPod order_id is empty after sanitization');
  }
  return cleaned;
}
