import { describe, expect, it, vi } from 'vitest';
import { generateKeyPairSync } from 'node:crypto';
import { espayProvider } from '../src/adapter';

const { privateKey: gPrivateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const privateKey = gPrivateKey.export({ type: 'pkcs8', format: 'pem' }).toString();

function input(overrides: Record<string, unknown> = {}) {
  return {
    orderId: 'order-1',
    amount: 50000,
    currency: 'IDR',
    customerEmail: 'a@test',
    customerName: 'Test User',
    description: 'Test',
    callbackUrl: 'https://callback',
    returnUrl: 'https://return',
    ...overrides,
  } as Parameters<ReturnType<typeof espayProvider>['createPaymentLink']>[0];
}

describe('Espay provider — adapter', () => {
  it('creates payment via Host-to-Host and maps webRedirectUrl', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({ responseCode: '2005400', responseMessage: 'Success', webRedirectUrl: 'https://checkout.espay.id/pay/abc' }),
        { status: 200 },
      ),
    );
    const provider = espayProvider({ partnerId: 'SGWYTEST', privateKey, fetch });
    const result = await provider.createPaymentLink(input());
    expect(result.paymentUrl).toBe('https://checkout.espay.id/pay/abc');
    expect(result.providerTransactionId).toBe('order-1');
    expect(fetch).toHaveBeenCalledTimes(1);
    const h = (fetch.mock.calls[0]?.[1] as RequestInit).headers as Record<string, string>;
    expect(h['X-PARTNER-ID']).toBe('SGWYTEST');
    expect(h['X-SIGNATURE']).toBeTruthy();
  });

  it('falls back to VA if Host-to-Host returns no redirect', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ responseCode: '2005400', responseMessage: 'Success' }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            responseCode: '2002700',
            virtualAccountData: { trxId: 'order-1', virtualAccountNo: ' 7001400002007725', additionalInfo: { channel: 'BRI' } },
          }),
          { status: 200 },
        ),
      );
    const provider = espayProvider({ partnerId: 'SGWYTEST', privateKey, fetch });
    const result = await provider.createPaymentLink(input());
    expect(result.vaNumber).toBe('7001400002007725');
  });

  it('creates QRIS and maps qrUrl', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({ responseCode: '2004700', partnerReferenceNo: 'order-qris-1', qrUrl: 'https://qr.espay.id/abc' }),
        { status: 200 },
      ),
    );
    const provider = espayProvider({ partnerId: 'SGWYTEST', privateKey, fetch });
    const result = await provider.createPaymentLink(input({ paymentMethod: 'qris' }));
    expect(result.paymentUrl).toBe('https://qr.espay.id/abc');
  });

  it('checkStatus maps VA 00 to completed', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          responseCode: '2002600',
          virtualAccountData: { paymentFlagStatus: '00', totalAmount: { value: '50000.00', currency: 'IDR' } },
        }),
        { status: 200 },
      ),
    );
    const provider = espayProvider({ partnerId: 'SGWYTEST', privateKey, fetch });
    const status = await provider.checkStatus('order-1');
    expect(status.status).toBe('completed');
  });

  it('throws on error responseCode', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response(JSON.stringify({ responseCode: '4002701', responseMessage: 'Invalid field' }), { status: 200 }),
    );
    const provider = espayProvider({ partnerId: 'SGWYTEST', privateKey, fetch });
    await expect(provider.createPaymentLink(input({ paymentMethod: 'qris' }))).rejects.toThrow(/Espay request failed/);
  });

  it('getApiEndpoint sandbox default', () => {
    expect(espayProvider({ partnerId: 'SGWYTEST', privateKey }).getApiEndpoint()).toBe('https://sandbox-api.espay.id');
  });
});
