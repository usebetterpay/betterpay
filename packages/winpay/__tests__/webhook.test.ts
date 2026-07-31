import { describe, expect, it } from 'vitest';
import { generateKeyPairSync } from 'node:crypto';
import { winpayProvider } from '../src/adapter';
import { createWinpaySignature } from '../src/signature';

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const privatePem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
const publicPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();

describe('Winpay provider — webhook', () => {
  it('verifies valid webhook signature', async () => {
    const body = JSON.stringify({
      partnerServiceId: '    9042',
      customerNo: '00000009',
      virtualAccountNo: '    904200000009',
      virtualAccountName: 'WINPAY - test',
      trxId: 'INV-1',
      paymentRequestId: '45539',
      paidAmount: { value: '10000.00', currency: 'IDR' },
      trxDateTime: '2024-01-11T08:57:55+07:00',
      additionalInfo: { contractId: 'si-1', channel: 'BSI' },
    });
    const ts = '2024-01-11T08:57:55+07:00';
    const path = '/v1.0/transfer-va/payment';
    const sig = createWinpaySignature('POST', path, body, ts, privatePem);
    const provider = winpayProvider({ partnerId: '170041', privateKey: privatePem, publicKey: publicPem });
    const ok = await provider.verifyWebhook({ body, headers: { 'x-signature': sig, 'x-timestamp': ts, 'x-callback-path': path } });
    expect(ok).toBe(true);
  });

  it('rejects invalid signature', async () => {
    const provider = winpayProvider({ partnerId: '170041', privateKey: privatePem, publicKey: publicPem });
    const ok = await provider.verifyWebhook({ body: '{}', headers: { 'x-signature': 'invalid', 'x-timestamp': '2024-01-11T08:57:55+07:00' } });
    expect(ok).toBe(false);
  });

  it('returns false without publicKey', async () => {
    const provider = winpayProvider({ partnerId: '170041', privateKey: privatePem });
    const ok = await provider.verifyWebhook({ body: '{}', headers: { 'x-signature': 'sig', 'x-timestamp': '2024-01-11T08:57:55+07:00' } });
    expect(ok).toBe(false);
  });

  it('normalizes webhook payload status to payment.* events', async () => {
    const provider = winpayProvider({ partnerId: '170041', privateKey: privatePem, publicKey: publicPem });
    const events = await provider.normalizeWebhook({
      body: JSON.stringify({ originalPartnerReferenceNo: 'order-1', latestTransactionStatus: '00', amount: { value: '10000', currency: 'IDR' } }),
      headers: {},
    });
    expect(events[0]?.name).toBe('payment.completed');
    expect(events[0]?.providerEventId).toBe('order-1');
  });

  it('normalizes pending status', async () => {
    const provider = winpayProvider({ partnerId: '170041', privateKey: privatePem, publicKey: publicPem });
    const events = await provider.normalizeWebhook({
      body: JSON.stringify({ originalPartnerReferenceNo: 'order-2', latestTransactionStatus: '03' }),
      headers: {},
    });
    expect(events[0]?.name).toBe('payment.pending');
  });

  it('returns empty on malformed JSON', async () => {
    const provider = winpayProvider({ partnerId: '170041', privateKey: privatePem, publicKey: publicPem });
    const events = await provider.normalizeWebhook({ body: 'not json', headers: {} });
    expect(events).toEqual([]);
  });
});
