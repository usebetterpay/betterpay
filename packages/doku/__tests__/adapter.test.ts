import { describe, expect, it, vi } from 'vitest';
import { generateKeyPairSync } from 'node:crypto';
import { dokuProvider } from '../src/adapter';

const { privateKey: generatedPrivateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const privateKey = generatedPrivateKey.export({ type: 'pkcs8', format: 'pem' }).toString();

describe('DOKU provider', () => {
  it('creates a BCA VA with token and SNAP headers', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ accessToken: 'token', expiresIn: 900, responseCode: '2007300' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ responseCode: '2002700', virtualAccountData: { trxId: 'order-1', virtualAccountNo: ' 19008001', totalAmount: { value: '10000.00', currency: 'IDR' } } }), { status: 200 }));
    const provider = dokuProvider({ clientId: 'MCH-1', privateKey, partnerServiceId: '19008', fetch });
    const result = await provider.createPaymentLink({ orderId: 'order-1', amount: 10000, currency: 'IDR', customerEmail: 'a@test', description: 'test', callbackUrl: 'https://callback', returnUrl: 'https://return' });
    expect(result.vaNumber).toBe('19008001');
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[1]?.[0]).toBe('https://api-sandbox.doku.com/virtual-accounts/bi-snap-va/v1/transfer-va/create-va');
    expect((fetch.mock.calls[1]?.[1] as RequestInit).headers).toMatchObject({ Authorization: 'Bearer token', 'CHANNEL-ID': 'H2H', 'X-PARTNER-ID': '19008' });
  });
});
