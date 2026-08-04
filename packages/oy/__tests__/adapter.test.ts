import { describe, expect, it, vi } from 'vitest';
import { oyProvider } from '../src/adapter';

describe('OY! provider — adapter', () => {
  it('disburse posts to /api/remit with correct headers', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response(JSON.stringify({ status: { code: '000', message: 'Success' }, trxId: 'trx-123', partnerTrxId: 'pt-123' }), {
        status: 200,
      }),
    );
    const provider = oyProvider({ username: 'user1', apiKey: 'key123', fetch });
    const result = await provider.disburse({
      recipientBank: '014',
      recipientAccount: '1234567890',
      amount: 100000,
      partnerTrxId: 'pt-123',
    });
    expect(result.providerTransactionId).toBe('trx-123');
    expect(result.status).toBe('completed');
    expect(fetch).toHaveBeenCalledTimes(1);
    const url = String(fetch.mock.calls[0]?.[0]);
    expect(url).toBe('https://partner.oyindonesia.com/api/remit');
    const headers = (fetch.mock.calls[0]?.[1] as RequestInit).headers as Record<string, string>;
    expect(headers['X-OY-Username']).toBe('user1');
    expect(headers['X-Api-Key']).toBe('key123');
  });

  it('checkStatus posts to /api/remit-status', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response(JSON.stringify({ status: { code: '000', message: 'Success' }, trxId: 'trx-123', amount: '100000' }), { status: 200 }),
    );
    const provider = oyProvider({ username: 'user1', apiKey: 'key123', fetch });
    const status = await provider.checkStatus('trx-123');
    expect(status.status).toBe('completed');
    expect(status.providerTransactionId).toBe('trx-123');
    expect(String(fetch.mock.calls[0]?.[0])).toContain('/api/remit-status');
  });

  it('createPaymentLink throws payout guidance', async () => {
    const provider = oyProvider({ username: 'user1', apiKey: 'key123' });
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
    ).rejects.toThrow(/use disburse/);
  });

  it('throws on non-ok response', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response('Unauthorized', { status: 401 }));
    const provider = oyProvider({ username: 'user1', apiKey: 'key123', fetch });
    await expect(provider.disburse({ recipientBank: '014', recipientAccount: '123', amount: 10000 })).rejects.toThrow(/OY! request failed/);
  });

  it('getApiEndpoint sandbox vs production', () => {
    expect(oyProvider({ username: 'u', apiKey: 'k' }).getApiEndpoint()).toBe('https://partner.oyindonesia.com');
    expect(oyProvider({ username: 'u', apiKey: 'k', isSandbox: true }).getApiEndpoint()).toBe('https://api-stg.oyindonesia.com');
  });

  it('capabilities has payout true and paymentLink false', () => {
    const p = oyProvider({ username: 'u', apiKey: 'k' });
    expect(p.capabilities.payout).toBe(true);
    expect(p.capabilities.paymentLink).toBe(false);
  });
});
