import { describe, expect, it, vi } from 'vitest';
import { faspayProvider } from '../src/adapter';

describe('Faspay provider — adapter', () => {
  it('creates payment link and maps paymentUrl', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response(JSON.stringify({ response_code: '00', payment_url: 'https://fpg.faspay.co.id/pay/abc', trx_id: 'trx-1' }), { status: 200 }),
    );
    const provider = faspayProvider({ merchantId: 'MCH-1', secretKey: 'secret', fetch });
    const result = await provider.createPaymentLink({
      orderId: 'order-1',
      amount: 10000,
      currency: 'IDR',
      customerEmail: 'a@test',
      description: 'Test',
      callbackUrl: 'https://callback',
      returnUrl: 'https://return',
    });
    expect(result.paymentUrl).toBe('https://fpg.faspay.co.id/pay/abc');
    expect(result.providerTransactionId).toBe('trx-1');
    expect(result.status).toBe('active');
    // secret hash added to body
    const body = JSON.parse(String((fetch.mock.calls[0]?.[1] as RequestInit).body)) as Record<string, unknown>;
    expect(body.signature).toBeTruthy();
  });

  it('falls back to orderId if trx_id missing', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response(JSON.stringify({ response_code: '00', payment_url: 'https://pay.com/abc' }), { status: 200 }),
    );
    const provider = faspayProvider({ merchantId: 'MCH-1', secretKey: 'secret', fetch });
    const result = await provider.createPaymentLink({
      orderId: 'order-99',
      amount: 10000,
      currency: 'IDR',
      customerEmail: 'a@test',
      description: 'Test',
      callbackUrl: 'https://callback',
      returnUrl: 'https://return',
    });
    expect(result.providerTransactionId).toBe('order-99');
  });

  it('checkStatus maps success', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response(JSON.stringify({ response_code: '00', status: 'SUCCESS', amount: '10000' }), { status: 200 }),
    );
    const provider = faspayProvider({ merchantId: 'MCH-1', secretKey: 'secret', fetch });
    const s = await provider.checkStatus('order-1');
    expect(s.status).toBe('completed');
  });

  it('throws on non-ok response', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response('Internal Error', { status: 500 }));
    const provider = faspayProvider({ merchantId: 'MCH-1', secretKey: 'secret', fetch });
    await expect(
      provider.createPaymentLink({
        orderId: 'order-1',
        amount: 10000,
        currency: 'IDR',
        customerEmail: 'a@test',
        description: 'Test',
        callbackUrl: 'https://callback',
        returnUrl: 'https://return',
      }),
    ).rejects.toThrow(/Faspay request failed/);
  });

  it('getApiEndpoint sandbox default', () => {
    expect(faspayProvider({ merchantId: 'MCH-1', secretKey: 'secret' }).getApiEndpoint()).toBe('https://fpg-sandbox.faspay.co.id');
    expect(faspayProvider({ merchantId: 'MCH-1', secretKey: 'secret', isSandbox: false }).getApiEndpoint()).toBe(
      'https://fpg.faspay.co.id',
    );
  });
});
