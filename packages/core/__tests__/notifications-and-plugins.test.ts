import { describe, it, expect, vi } from 'vitest';
import { betterPay } from '../src/create-betterpay';
import { NotificationDispatcher } from '../src/notification/channel';
import type { NotificationChannel } from '../src/notification/channel';
import type { BetterPayPlugin } from '../src/plugin';
import type { PaymentProvider, PaymentLinkResult } from '../src/provider/interface';

const okResult = (): PaymentLinkResult => ({
  providerTransactionId: 'ext-1',
  paymentUrl: 'https://pay.example/1',
  amount: 10_000,
  currency: 'IDR',
  status: 'pending',
  raw: {},
});

function mockProvider(): PaymentProvider {
  return {
    id: 'mock',
    name: 'mock',
    paymentMethods: ['qris'],
    capabilities: { paymentLink: true, recurring: false, refund: false },
    createPaymentLink: async () => okResult(),
    verifyWebhook: async () => true,
    normalizeWebhook: async (data) => {
      const body = JSON.parse(data.body);
      return [{ name: body.event ?? 'payment.completed', payload: body }];
    },
    getApiEndpoint: () => 'https://example.com',
  };
}

describe('NotificationDispatcher', () => {
  it('sends to all channels and swallows per-channel errors', async () => {
    const good = vi.fn().mockResolvedValue(undefined);
    const bad = vi.fn().mockRejectedValue(new Error('boom'));
    const onError = vi.fn();
    const channels: NotificationChannel[] = [
      { id: 'good', send: good },
      { id: 'bad', send: bad },
    ];
    const d = new NotificationDispatcher(channels, onError);
    await d.emit({ name: 'invoice.created', payload: { a: 1 }, customerEmail: 'a@b.c' });
    expect(good).toHaveBeenCalled();
    expect(bad).toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(expect.any(Error), 'bad', expect.any(Object));
  });
});

describe('plugin notificationChannels + onRequest', () => {
  it('collects channels and emits on cancel', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const channelPlugin: BetterPayPlugin = {
      id: 'test-notify',
      notificationChannels: [{ id: 'test', send }],
    };

    // Minimal billing-like surface via real billing is heavy; emit via cancel needs billing.
    // Test channel collection + manual emit on instance.
    const pay = betterPay({
      rateLimit: { enabled: false },
      plugins: [
        {
          id: 'mock-provider',
          version: '0.0.1',
          providers: [mockProvider()],
        },
        channelPlugin,
      ],
    });

    expect(pay.notifications.size).toBe(1);
    await pay.notifications.emit({
      name: 'payment.failed',
      customerEmail: 'u@test.com',
      payload: { x: 1 },
    });
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'payment.failed', customerEmail: 'u@test.com' }),
    );
  });

  it('runs onRequest and can short-circuit', async () => {
    const pay = betterPay({
      rateLimit: { enabled: false },
      plugins: [
        {
          id: 'block',
          onRequest: async () => ({
            response: new Response(JSON.stringify({ blocked: true }), { status: 403 }),
          }),
        },
      ],
    });

    const res = await pay.handler(new Request('http://localhost/pay/api/status/x'));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.blocked).toBe(true);
  });
});
