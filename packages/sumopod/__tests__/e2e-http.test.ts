/**
 * Live HTTP E2E against SumoPod sandbox + BetterPay factory.
 * Requires SUMOPOD_API_KEY.
 */
import { describe, it, expect } from 'vitest';
import { createHmac } from 'node:crypto';
import { betterPay } from '@betterpay/core';
import { sumopod, SumopodProvider } from '../src/index';

const apiKey = process.env.SUMOPOD_API_KEY;
const describeLive = apiKey ? describe : describe.skip;

describeLive('SumoPod HTTP E2E (live sandbox)', () => {
  it('createPayment via provider + factory, webhook token + svix', async () => {
    const provider = new SumopodProvider({
      apiKey: apiKey!,
      isSandbox: true,
      webhookToken: 'whtok_demo',
    });

    const orderA = `bp_e2e_a_${Date.now()}`;
    const link = await provider.createPaymentLink({
      orderId: orderA,
      amount: 15_000,
      currency: 'IDR',
      customerEmail: 'e2e@betterpay.test',
      description: 'E2E provider',
      callbackUrl: 'https://example.com/cancel',
      returnUrl: 'https://example.com/ok',
      expiryMinutes: 60,
    });

    expect(link.providerTransactionId).toBeTruthy();
    expect(link.amount).toBe(15_000);
    if (link.paymentUrl) {
      expect(link.paymentUrl).toMatch(/^https:\/\//);
    }

    // Factory createTransaction
    const pay = betterPay({
      rateLimit: { enabled: false },
      plugins: [
        sumopod({
          apiKey: apiKey!,
          isSandbox: true,
          webhookToken: 'whtok_demo',
        }),
      ],
    });

    const orderB = `bp_e2e_b_${Date.now()}`;
    const txn = await pay.createTransaction({
      orderId: orderB,
      amount: 20_000,
      currency: 'IDR',
      customerEmail: 'user@betterpay.test',
      returnUrl: 'https://example.com/ok',
      callbackUrl: 'https://example.com/cancel',
    });

    expect(txn.orderId).toBe(orderB);
    expect(txn.providerTransactionId).toBeTruthy();
    expect(txn.status).toBe('active');

    const body = JSON.stringify({
      event_type: 'payment.completed',
      data: {
        payment_id: txn.providerTransactionId,
        order_id: orderB,
        amount: 20_000,
        fee: 440,
        net_amount: 19_560,
        status: 'completed',
        payment_method: 'qris',
        completed_at: new Date().toISOString(),
      },
    });

    const whOk = await pay.handleWebhook('sumopod', {
      body,
      headers: {
        'content-type': 'application/json',
        'x-webhook-token': 'whtok_demo',
      },
    });
    expect(whOk.success).toBe(true);
    expect(whOk.eventName).toBe('payment.completed');

    const st = await pay.getStatus(orderB);
    expect(st?.status).toBe('completed');

    const whBad = await pay.handleWebhook('sumopod', {
      body,
      headers: { 'x-webhook-token': 'wrong' },
    });
    expect(whBad.success).toBe(false);

    // Svix HMAC path
    const secretRaw = 'betterpay-svix-test-secret!!';
    const secret = `whsec_${Buffer.from(secretRaw).toString('base64')}`;
    const paySvix = betterPay({
      rateLimit: { enabled: false },
      plugins: [
        sumopod({
          apiKey: apiKey!,
          isSandbox: true,
          webhookSecret: secret,
        }),
      ],
    });

    const orderC = `bp_e2e_c_${Date.now()}`;
    const txn2 = await paySvix.createTransaction({
      orderId: orderC,
      amount: 12_000,
      currency: 'IDR',
      customerEmail: 'svix@test.com',
      returnUrl: 'https://example.com/ok',
    });

    const body2 = JSON.stringify({
      event_type: 'payment.completed',
      data: {
        payment_id: txn2.providerTransactionId,
        order_id: orderC,
        amount: 12_000,
        status: 'completed',
      },
    });
    const svixId = 'msg_e2e_1';
    const svixTs = String(Math.floor(Date.now() / 1000));
    const sig = createHmac('sha256', Buffer.from(secretRaw))
      .update(`${svixId}.${svixTs}.${body2}`)
      .digest('base64');

    const whSvix = await paySvix.handleWebhook('sumopod', {
      body: body2,
      headers: {
        'svix-id': svixId,
        'svix-timestamp': svixTs,
        'svix-signature': `v1,${sig}`,
      },
    });
    expect(whSvix.success).toBe(true);
    expect((await paySvix.getStatus(orderC))?.status).toBe('completed');
  }, 60_000);
});
