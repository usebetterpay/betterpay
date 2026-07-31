import { describe, expect, it, vi } from 'vitest';
import { generateKeyPairSync } from 'node:crypto';
import { winpayProvider } from '../src/adapter';

const { privateKey: gPrivateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const privateKey = gPrivateKey.export({ type: 'pkcs8', format: 'pem' }).toString();

function baseInput(overrides: Record<string, unknown> = {}) {
  return {
    orderId: 'order-1',
    amount: 25000,
    currency: 'IDR',
    customerEmail: 'a@test',
    customerName: 'Test User',
    description: 'Test order',
    callbackUrl: 'https://callback',
    returnUrl: 'https://return',
    ...overrides,
  } as Parameters<ReturnType<typeof winpayProvider>['createPaymentLink']>[0];
}

describe('Winpay provider — adapter', () => {
  it('creates a VA with SNAP headers and maps vaNumber', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          responseCode: '2002700',
          responseMessage: 'Success',
          virtualAccountData: {
            partnerServiceId: '   22691',
            customerNo: '00000009',
            virtualAccountNo: '   2269141693898987',
            virtualAccountName: 'Test User',
            trxId: 'order-1',
            totalAmount: { value: '25000.00', currency: 'IDR' },
            expiredDate: '2024-02-26T19:04:51+07:00',
            additionalInfo: { channel: 'BRI', contractId: 'c-1' },
          },
        }),
        { status: 200 },
      ),
    );
    const provider = winpayProvider({ partnerId: '170041', privateKey, fetch });
    const result = await provider.createPaymentLink(baseInput());
    expect(result.vaNumber).toBe('2269141693898987');
    expect(result.providerTransactionId).toBe('order-1');
    expect(result.status).toBe('active');
    expect(fetch).toHaveBeenCalledTimes(1);
    const url = String(fetch.mock.calls[0]?.[0]);
    expect(url).toBe('https://sandbox-snap.winpay.id/v1.0/transfer-va/create-va');
    const headers = fetch.mock.calls[0]?.[1] as RequestInit;
    const h = headers.headers as Record<string, string>;
    expect(h['X-PARTNER-ID']).toBe('170041');
    expect(h['X-SIGNATURE']).toBeTruthy();
    expect(h['X-TIMESTAMP']).toBeTruthy();
    expect(h['X-EXTERNAL-ID']).toBeTruthy();
  });

  it('creates QRIS and maps qrUrl to paymentUrl', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          responseCode: '2004700',
          responseMessage: 'Success',
          partnerReferenceNo: 'order-qris-1',
          qrUrl: 'https://sandbox-payment.winpay.id/scqr/get_image_qr?payid=abc',
          qrContent: null,
          additionalInfo: { contractId: 'qr-1', expiredAt: '2024-02-26T19:04:51+07:00', isStatic: false },
        }),
        { status: 200 },
      ),
    );
    const provider = winpayProvider({ partnerId: '170041', privateKey, fetch });
    const result = await provider.createPaymentLink(baseInput({ paymentMethod: 'qris' }));
    expect(result.paymentUrl).toBe('https://sandbox-payment.winpay.id/scqr/get_image_qr?payid=abc');
    expect(result.providerTransactionId).toBe('order-qris-1');
  });

  it('checkStatus maps VA flag 00 to completed', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          responseCode: '2002600',
          responseMessage: 'Successful',
          virtualAccountData: {
            virtualAccountNo: '2269141708949044',
            paymentFlagStatus: '00',
            totalAmount: { value: '25000.00', currency: 'IDR' },
          },
          additionalInfo: { contractId: 'c-1', channel: 'BRI', trxId: 'order-1' },
        }),
        { status: 200 },
      ),
    );
    const provider = winpayProvider({ partnerId: '170041', privateKey, fetch });
    const status = await provider.checkStatus('order-1');
    expect(status.status).toBe('completed');
    expect(status.providerTransactionId).toBe('order-1');
  });

  it('throws on non-200 responseCode', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response(JSON.stringify({ responseCode: '4002701', responseMessage: 'Invalid field format customerNo' }), {
        status: 200,
      }),
    );
    const provider = winpayProvider({ partnerId: '170041', privateKey, fetch });
    await expect(provider.createPaymentLink(baseInput())).rejects.toThrow(/Winpay request failed/);
  });

  it('getApiEndpoint returns sandbox by default', () => {
    const provider = winpayProvider({ partnerId: '170041', privateKey });
    expect(provider.getApiEndpoint()).toBe('https://sandbox-snap.winpay.id');
  });

  it('capabilities include VA and QRIS', () => {
    const provider = winpayProvider({ partnerId: '170041', privateKey });
    expect(provider.paymentMethods).toContain('virtual_account');
    expect(provider.paymentMethods).toContain('qris');
    expect(provider.capabilities.virtualAccount).toBe(true);
  });
});
