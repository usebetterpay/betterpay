import { describe, expect, it } from 'vitest';
import { faspayProvider } from '../src/adapter';
import { createFaspayHashSignature } from '../src/signature';

describe('Faspay provider — webhook', () => {
  it('verifies hash webhook with correct signature', async () => {
    const secret = 'mysecret';
    const merchantId = 'MCH-1';
    const merchantTranId = 'order-1';
    const amount = 10000;
    const sig = createFaspayHashSignature(merchantId, merchantTranId, amount, secret);
    const body = JSON.stringify({ merchantId, merchantTranId, amount, status: 'SUCCESS' });
    const provider = faspayProvider({ merchantId, secretKey: secret });
    expect(await provider.verifyWebhook({ body, headers: { 'x-signature': sig } })).toBe(true);
  });

  it('rejects invalid signature', async () => {
    const provider = faspayProvider({ merchantId: 'MCH-1', secretKey: 'secret' });
    const body = JSON.stringify({ merchantId: 'MCH-1', merchantTranId: 'order-1', amount: 10000 });
    expect(await provider.verifyWebhook({ body, headers: { 'x-signature': 'bad' } })).toBe(false);
  });

  it('normalizes completed event', async () => {
    const provider = faspayProvider({ merchantId: 'MCH-1', secretKey: 'secret' });
    const ev = await provider.normalizeWebhook({
      body: JSON.stringify({ merchantTranId: 'order-1', status: 'SUCCESS' }),
      headers: {},
    });
    expect(ev[0]?.name).toBe('payment.completed');
    expect(ev[0]?.providerEventId).toBe('order-1');
  });

  it('returns empty on malformed JSON', async () => {
    const provider = faspayProvider({ merchantId: 'MCH-1', secretKey: 'secret' });
    expect(await provider.normalizeWebhook({ body: 'not json', headers: {} })).toEqual([]);
  });
});
