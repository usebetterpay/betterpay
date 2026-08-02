import { describe, expect, it, vi } from 'vitest';
import { generateKeyPairSync } from 'node:crypto';
import { nicepayProvider } from '../src/adapter';

const { privateKey: gPrivateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const privateKey = gPrivateKey.export({ type: 'pkcs8', format: 'pem' }).toString();

function input(overrides: Record<string, unknown> = {}) {
  return {
    orderId: 'order-1',
    amount: 10000,
    currency: 'IDR',
    customerEmail: 'a@test',
    customerName: 'Jhon Doe',
    description: 'Test',
    callbackUrl: 'https://callback',
    returnUrl: 'https://return',
    ...overrides,
  } as Parameters<ReturnType<typeof nicepayProvider>['createPaymentLink']>[0];
}

describe('Nicepay provider — adapter', () => {
  it('creates VA and maps vaNumber', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          responseCode: '2002700',
          responseMessage: 'Successful',
          virtualAccountData: {
            partnerServiceId: '',
            customerNo: '',
            virtualAccountNo: '7001400002007725',
            trxId: 'order-1',
            totalAmount: { value: '10000.00', currency: 'IDR' },
            additionalInfo: { bankCd: 'BMRI', tXidVA: 'TNICEVA02302202403061508052242' },
          },
        }),
        { status: 200 },
      ),
    );
    const provider = nicepayProvider({ partnerId: 'IONPAYTEST', privateKey, fetch });
    const result = await provider.createPaymentLink(input());
    expect(result.vaNumber).toBe('7001400002007725');
    expect(result.providerTransactionId).toBe('order-1');
    expect(result.status).toBe('active');
    expect(fetch).toHaveBeenCalledTimes(1);
    const h = (fetch.mock.calls[0]?.[1] as RequestInit).headers as Record<string, string>;
    expect(h['X-PARTNER-ID']).toBe('IONPAYTEST');
  });

  it('creates QRIS and maps qrUrl', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({ responseCode: '2004700', partnerReferenceNo: 'order-qris-1', qrUrl: 'https://qr.nicepay.id/abc' }),
        { status: 200 },
      ),
    );
    const provider = nicepayProvider({ partnerId: 'IONPAYTEST', privateKey, fetch });
    const result = await provider.createPaymentLink(input({ paymentMethod: 'qris' }));
    expect(result.paymentUrl).toBe('https://qr.nicepay.id/abc');
  });

  it('checkStatus maps success', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          responseCode: '2002600',
          virtualAccountData: { paymentFlagStatus: '00', totalAmount: { value: '10000.00', currency: 'IDR' } },
        }),
        { status: 200 },
      ),
    );
    const provider = nicepayProvider({ partnerId: 'IONPAYTEST', privateKey, fetch });
    const s = await provider.checkStatus('order-1');
    expect(s.status).toBe('completed');
  });

  it('throws on error responseCode', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response(JSON.stringify({ responseCode: '4002701', responseMessage: 'Invalid field' }), { status: 200 }),
    );
    const provider = nicepayProvider({ partnerId: 'IONPAYTEST', privateKey, fetch });
    await expect(provider.createPaymentLink(input({ paymentMethod: 'qris' }))).rejects.toThrow(/Nicepay request failed/);
  });

  it('getApiEndpoint dev default', () => {
    expect(nicepayProvider({ partnerId: 'IONPAYTEST', privateKey }).getApiEndpoint()).toBe('https://dev.nicepay.co.id');
  });
});
