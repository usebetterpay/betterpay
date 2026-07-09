import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHmac } from 'node:crypto';
import { SumopodProvider, sumopod } from '../src/index';

function makeSecret(raw = 'adapter-test-secret-bytes!!'): string {
  return `whsec_${Buffer.from(raw, 'utf8').toString('base64')}`;
}

function sign(secret: string, id: string, ts: string, body: string): string {
  const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
  return `v1,${createHmac('sha256', key).update(`${id}.${ts}.${body}`).digest('base64')}`;
}

describe('SumopodProvider', () => {
  const secret = makeSecret();
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
  });

  it('plugin factory registers provider', () => {
    const plugin = sumopod({
      apiKey: 'test-api-key-long-enough',
      webhookSecret: secret,
    });
    expect(plugin.id).toBe('sumopod');
    expect(plugin.providers?.[0]?.id).toBe('sumopod');
    expect(plugin.defaultProvider).toBe('sumopod');
  });

  it('requires apiKey', () => {
    expect(() => new SumopodProvider({ apiKey: '' } as any)).toThrow(/apiKey/);
  });

  it('creates payment via X-API-Key', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        payment_id: 'pay-uuid-1',
        order_id: 'ord_1',
        amount: 50_000,
        fee: 750,
        net_amount: 49_250,
        currency: 'IDR',
        payment_link_url: 'https://sumo.sandbox.example/pay/1',
        status: 'pending',
        expires_at: '2026-07-21T00:00:00Z',
      }),
    });

    const provider = new SumopodProvider({
      apiKey: 'k'.repeat(32),
      webhookSecret: secret,
      fetch: fetchMock as unknown as typeof fetch,
    });

    const result = await provider.createPaymentLink({
      orderId: 'ord_1',
      amount: 50_000,
      currency: 'IDR',
      customerEmail: 'a@b.c',
      description: 'test',
      callbackUrl: 'https://app.example/cancel',
      returnUrl: 'https://app.example/ok',
    });

    expect(result.providerTransactionId).toBe('pay-uuid-1');
    expect(result.paymentUrl).toContain('https://');
    expect(result.status).toBe('pending');
    expect(result.amount).toBe(50_000);

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toContain('/payments');
    expect((init as RequestInit).headers).toMatchObject({
      'X-API-Key': 'k'.repeat(32),
      'Content-Type': 'application/json',
    });
    const body = JSON.parse(String((init as RequestInit).body));
    expect(body).toMatchObject({
      order_id: 'ord_1',
      amount: 50_000,
      currency: 'IDR',
      success_return_url: 'https://app.example/ok',
      cancel_return_url: 'https://app.example/cancel',
    });
  });

  it('throws on API error', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'No API key',
    });
    const provider = new SumopodProvider({
      apiKey: 'k'.repeat(32),
      webhookToken: 'whtok_x',
      fetch: fetchMock as unknown as typeof fetch,
    });
    await expect(
      provider.createPaymentLink({
        orderId: 'x',
        amount: 1000,
        currency: 'IDR',
        customerEmail: 'a@b.c',
        description: 'd',
        callbackUrl: '',
        returnUrl: '',
      }),
    ).rejects.toThrow(/401/);
  });

  it('verifies and normalizes webhook payload', async () => {
    const body = JSON.stringify({
      event_type: 'payment.completed',
      data: {
        payment_id: 'uuid-p',
        order_id: 'INV-2026-001',
        amount: 50000,
        fee: 750,
        net_amount: 49250,
        status: 'completed',
        payment_method: 'qris',
        completed_at: '2026-06-18T12:00:00Z',
      },
    });
    const id = 'msg_wh';
    const ts = String(Math.floor(Date.now() / 1000));
    const sig = sign(secret, id, ts, body);

    const provider = new SumopodProvider({
      apiKey: 'k'.repeat(32),
      webhookSecret: secret,
    });

    const ok = await provider.verifyWebhook({
      body,
      headers: {
        'svix-id': id,
        'svix-timestamp': ts,
        'svix-signature': sig,
      },
    });
    expect(ok).toBe(true);

    const events = await provider.normalizeWebhook({ body, headers: {} });
    expect(events).toHaveLength(1);
    expect(events[0]!.name).toBe('payment.completed');
    expect(events[0]!.payload.order_id).toBe('INV-2026-001');
    expect(events[0]!.providerEventId).toBe('payment.completed:uuid-p');
  });

  it('maps failed / expired events', async () => {
    const provider = new SumopodProvider({
      apiKey: 'k'.repeat(32),
      webhookToken: 'whtok_t',
    });
    for (const [event_type, expected] of [
      ['payment.failed', 'payment.failed'],
      ['payment.expired', 'payment.expired'],
      ['payment.test', 'payment.pending'],
    ] as const) {
      const body = JSON.stringify({
        event_type,
        data: { order_id: 'o', payment_id: 'p' },
      });
      const [ev] = await provider.normalizeWebhook({ body, headers: {} });
      expect(ev!.name).toBe(expected);
    }
  });

  it('checkStatus documents webhook-only limitation', async () => {
    const provider = new SumopodProvider({
      apiKey: 'k'.repeat(32),
      webhookToken: 't',
    });
    await expect(provider.checkStatus('pay-1')).rejects.toThrow(/not available/);
  });

  it('uses sandbox base by default', () => {
    const p = new SumopodProvider({
      apiKey: 'k'.repeat(32),
      webhookToken: 't',
    });
    expect(p.getApiEndpoint()).toContain('sandbox');
  });
});
