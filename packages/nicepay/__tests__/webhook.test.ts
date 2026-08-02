import { describe, expect, it } from 'vitest';
import { generateKeyPairSync } from 'node:crypto';
import { nicepayProvider } from '../src/adapter';
import { createNicepaySignature } from '../src/signature';

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const privatePem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
const publicPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();

describe('Nicepay provider — webhook', () => {
  it('verifies valid webhook', async () => {
    const body = JSON.stringify({ trxId: 'order-1', status: '00' });
    const ts = '2024-03-14T07:49:28+07:00';
    const path = '/nicepay/api/v1.0/transfer-va/payment';
    const sig = createNicepaySignature('POST', path, body, ts, privatePem);
    const provider = nicepayProvider({ partnerId: 'IONPAYTEST', privateKey: privatePem, publicKey: publicPem });
    expect(await provider.verifyWebhook({ body, headers: { 'x-signature': sig, 'x-timestamp': ts, 'x-callback-path': path } })).toBe(
      true,
    );
  });

  it('rejects invalid signature', async () => {
    const provider = nicepayProvider({ partnerId: 'IONPAYTEST', privateKey: privatePem, publicKey: publicPem });
    expect(await provider.verifyWebhook({ body: '{}', headers: { 'x-signature': 'bad', 'x-timestamp': '2024-03-14T07:49:28+07:00' } })).toBe(
      false,
    );
  });

  it('returns false without publicKey', async () => {
    const provider = nicepayProvider({ partnerId: 'IONPAYTEST', privateKey: privatePem });
    expect(await provider.verifyWebhook({ body: '{}', headers: { 'x-signature': 'sig', 'x-timestamp': '2024-03-14T07:49:28+07:00' } })).toBe(
      false,
    );
  });

  it('normalizes completed event', async () => {
    const provider = nicepayProvider({ partnerId: 'IONPAYTEST', privateKey: privatePem });
    const ev = await provider.normalizeWebhook({
      body: JSON.stringify({ originalPartnerReferenceNo: 'order-1', latestTransactionStatus: '00' }),
      headers: {},
    });
    expect(ev[0]?.name).toBe('payment.completed');
  });

  it('returns empty on malformed JSON', async () => {
    const provider = nicepayProvider({ partnerId: 'IONPAYTEST', privateKey: privatePem });
    expect(await provider.normalizeWebhook({ body: 'not json', headers: {} })).toEqual([]);
  });
});
