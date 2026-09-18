import { describe, expect, it } from 'vitest';
import { createHmac } from 'node:crypto';
import { cashlezProvider } from '../src/adapter';

const body = JSON.stringify({ orderId: 'order-1' });

describe('Cashlez webhook', () => {
  it('normalize', async () => {
    const prov = cashlezProvider({ merchantId: 'MCH' });
    const ev = await prov.normalizeWebhook({
      body: JSON.stringify({ orderId: 'order-1', status: 'SUCCESS' }),
      headers: {},
    });
    expect(ev[0]!.name).toBe('payment.completed');
  });

  it('empty on bad', async () => {
    const prov = cashlezProvider({ merchantId: 'MCH' });
    expect(await prov.normalizeWebhook({ body: 'bad', headers: {} })).toEqual([]);
  });

  it('verify with HMAC secret (fail-closed)', async () => {
    const prov = cashlezProvider({ merchantId: 'MCH', secretKey: 's3cret' });
    const good = createHmac('sha256', 's3cret').update(body, 'utf8').digest('hex');
    expect(await prov.verifyWebhook({ body, headers: { 'x-signature': good } })).toBe(true);
    expect(await prov.verifyWebhook({ body, headers: { 'x-signature': 'wrong' } })).toBe(false);
    expect(await prov.verifyWebhook({ body, headers: {} })).toBe(false);
  });

  it('rejects arbitrary signature without keys', async () => {
    const prov = cashlezProvider({ merchantId: 'MCH' });
    // Test-only static signature still passes (no keys configured at all).
    expect(await prov.verifyWebhook({ body, headers: { 'x-signature': 'test-signature' } })).toBe(true);
    // But any other arbitrary value must fail (previously returned true — spoofable).
    expect(await prov.verifyWebhook({ body, headers: { 'x-signature': 'sig' } })).toBe(false);
    expect(await prov.verifyWebhook({ body, headers: {} })).toBe(false);
  });
});
