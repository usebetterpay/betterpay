import { describe, it, expect } from 'vitest';
import { createHmac } from 'node:crypto';
import {
  verifySumopodSignature,
  verifySumopodToken,
  verifySumopodWebhook,
  parseSumopodWebhook,
  sanitizeOrderId,
} from '../src/signature';

function makeSecret(raw = 'test-secret-bytes-for-hmac!!'): string {
  return `whsec_${Buffer.from(raw, 'utf8').toString('base64')}`;
}

function sign(secret: string, id: string, ts: string, body: string): string {
  const b64 = secret.replace(/^whsec_/, '');
  const key = Buffer.from(b64, 'base64');
  const expected = createHmac('sha256', key)
    .update(`${id}.${ts}.${body}`, 'utf8')
    .digest('base64');
  return `v1,${expected}`;
}

describe('verifySumopodSignature', () => {
  const secret = makeSecret();
  const body = JSON.stringify({
    event_type: 'payment.completed',
    data: { order_id: 'ORD-1', payment_id: 'pay-1' },
  });
  const id = 'msg_abc';
  const ts = String(Math.floor(Date.now() / 1000));

  it('accepts valid v1 signature', () => {
    const sig = sign(secret, id, ts, body);
    expect(verifySumopodSignature(secret, id, ts, sig, body)).toBe(true);
  });

  it('accepts one of multiple space-separated signatures', () => {
    const good = sign(secret, id, ts, body);
    const bad = 'v1,aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa=';
    expect(verifySumopodSignature(secret, id, ts, `${bad} ${good}`, body)).toBe(true);
  });

  it('rejects tampered body', () => {
    const sig = sign(secret, id, ts, body);
    expect(verifySumopodSignature(secret, id, ts, sig, body + ' ')).toBe(false);
  });

  it('rejects wrong secret', () => {
    const sig = sign(secret, id, ts, body);
    expect(verifySumopodSignature(makeSecret('other-secret-bytes!!!!!!'), id, ts, sig, body)).toBe(
      false,
    );
  });
});

describe('verifySumopodToken', () => {
  it('matches tokens', () => {
    expect(verifySumopodToken('whtok_abc', 'whtok_abc')).toBe(true);
  });

  it('rejects mismatch', () => {
    expect(verifySumopodToken('whtok_abc', 'whtok_xyz')).toBe(false);
  });

  it('rejects empty', () => {
    expect(verifySumopodToken('', 'x')).toBe(false);
    expect(verifySumopodToken('x', '')).toBe(false);
  });
});

describe('verifySumopodWebhook', () => {
  const secret = makeSecret();
  const body = '{"event_type":"payment.completed","data":{"order_id":"o1"}}';
  const id = 'msg_1';
  const ts = String(Math.floor(Date.now() / 1000));

  it('verifies via svix headers when secret set', () => {
    const sig = sign(secret, id, ts, body);
    expect(
      verifySumopodWebhook(body, {
        'svix-id': id,
        'svix-timestamp': ts,
        'svix-signature': sig,
      }, { webhookSecret: secret }),
    ).toBe(true);
  });

  it('rejects stale timestamp beyond tolerance', () => {
    const oldTs = String(Math.floor(Date.now() / 1000) - 10_000);
    const sig = sign(secret, id, oldTs, body);
    expect(
      verifySumopodWebhook(
        body,
        {
          'svix-id': id,
          'svix-timestamp': oldTs,
          'svix-signature': sig,
        },
        { webhookSecret: secret, toleranceSeconds: 300 },
      ),
    ).toBe(false);
  });

  it('verifies via X-Webhook-Token when only token configured', () => {
    expect(
      verifySumopodWebhook(
        body,
        { 'x-webhook-token': 'whtok_test' },
        { webhookToken: 'whtok_test' },
      ),
    ).toBe(true);
  });

  it('returns false when neither secret nor token configured', () => {
    expect(verifySumopodWebhook(body, {}, {})).toBe(false);
  });
});

describe('parseSumopodWebhook', () => {
  it('parses valid payload', () => {
    const raw = JSON.stringify({
      event_type: 'payment.completed',
      data: {
        payment_id: 'uuid',
        order_id: 'INV-2026-001',
        amount: 50000,
        status: 'completed',
      },
    });
    const p = parseSumopodWebhook(raw);
    expect(p.event_type).toBe('payment.completed');
    expect(p.data.order_id).toBe('INV-2026-001');
    expect(p.data.amount).toBe(50000);
  });

  it('throws on invalid shape', () => {
    expect(() => parseSumopodWebhook('{}')).toThrow();
  });
});

describe('sanitizeOrderId', () => {
  it('keeps valid ids', () => {
    expect(sanitizeOrderId('ORD-001')).toBe('ORD-001');
  });

  it('replaces invalid characters', () => {
    expect(sanitizeOrderId('order:foo/bar')).toBe('order-foo-bar');
  });
});
