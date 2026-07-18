/**
 * Live HTTP E2E against Midtrans sandbox + BetterPay factory.
 * Requires MIDTRANS_SERVER_KEY.
 */
import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { betterPay } from '@betterpay/core';
import { midtrans, midtransProvider } from '../src/index';

const serverKey = process.env.MIDTRANS_SERVER_KEY;
const describeLive = serverKey ? describe : describe.skip;

function sha512(msg: string): string {
  return createHash('sha512').update(msg, 'utf8').digest('hex');
}

describeLive('Midtrans HTTP E2E (live sandbox)', () => {
  it('Snap create + notification signature via factory', async () => {
    const provider = midtransProvider({
      serverKey: serverKey!,
      clientKey: process.env.MIDTRANS_CLIENT_KEY,
      isSandbox: true,
    });

    const orderA = `bp_mt_a_${Date.now()}`.slice(0, 50);
    const link = await provider.createPaymentLink({
      orderId: orderA,
      amount: 10_000,
      currency: 'IDR',
      customerEmail: 'e2e@betterpay.test',
      customerName: 'BetterPay E2E',
      description: 'E2E provider',
      returnUrl: 'https://example.com/finish',
      items: [{ name: 'Test item', price: 10_000, quantity: 1 }],
    });

    expect(link.providerTransactionId).toBeTruthy(); // snap token
    expect(link.amount).toBe(10_000);
    if (link.paymentUrl) {
      expect(link.paymentUrl).toMatch(/^https:\/\//);
    }

    const pay = betterPay({
      rateLimit: { enabled: false },
      plugins: [
        midtrans({
          serverKey: serverKey!,
          clientKey: process.env.MIDTRANS_CLIENT_KEY,
          isSandbox: true,
        }),
      ],
    });

    const orderB = `bp_mt_b_${Date.now()}`.slice(0, 50);
    const txn = await pay.createTransaction({
      orderId: orderB,
      amount: 15_000,
      currency: 'IDR',
      customerEmail: 'user@betterpay.test',
      returnUrl: 'https://example.com/finish',
      description: 'E2E factory',
    });

    expect(txn.orderId).toBe(orderB);
    expect(txn.providerTransactionId).toBeTruthy();
    expect(txn.status).toBe('active');

    const statusCode = '200';
    const grossAmount = '15000.00';
    const signature = sha512(`${orderB}${statusCode}${grossAmount}${serverKey}`);
    const body = JSON.stringify({
      order_id: orderB,
      status_code: statusCode,
      gross_amount: grossAmount,
      transaction_status: 'settlement',
      transaction_id: `sim-${Date.now()}`,
      signature_key: signature,
      payment_type: 'qris',
    });

    const whOk = await pay.handleWebhook('midtrans', {
      body,
      headers: { 'content-type': 'application/json' },
    });
    expect(whOk.success).toBe(true);
    expect(whOk.eventName).toBe('payment.completed');

    const badBody = JSON.stringify({
      ...JSON.parse(body),
      signature_key: 'deadbeef',
    });
    const bad = await pay.handleWebhook('midtrans', {
      body: badBody,
      headers: { 'content-type': 'application/json' },
    });
    expect(bad.success).toBe(false);
  }, 30_000);
});
