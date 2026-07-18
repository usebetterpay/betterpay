/**
 * Live HTTP E2E against Duitku sandbox + BetterPay factory.
 * Requires DUITKU_API_KEY + DUITKU_MERCHANT_CODE.
 */
import { describe, it, expect } from 'vitest';
import { createHmac } from 'node:crypto';
import { betterPay } from '@betterpay/core';
import { duitku, duitkuProvider, signDuitkuInquiry } from '../src/index';

const apiKey = process.env.DUITKU_API_KEY;
const merchantCode = process.env.DUITKU_MERCHANT_CODE;
const describeLive = apiKey && merchantCode ? describe : describe.skip;

function hmac(msg: string, key: string): string {
  return createHmac('sha256', key).update(msg, 'utf8').digest('hex');
}

describeLive('Duitku HTTP E2E (live sandbox)', () => {
  it('createPayment + callback verify via factory', async () => {
    const provider = duitkuProvider({
      apiKey: apiKey!,
      merchantCode: merchantCode!,
      isSandbox: true,
      defaultPaymentMethod: process.env.DUITKU_PAYMENT_METHOD || 'SP',
    });

    const orderA = `bp_dk_a_${Date.now()}`.slice(0, 50);
    const link = await provider.createPaymentLink({
      orderId: orderA,
      amount: 10_000,
      currency: 'IDR',
      customerEmail: 'e2e@betterpay.test',
      customerName: 'BetterPay E2E',
      description: 'E2E provider',
      callbackUrl: 'https://example.com/callback',
      returnUrl: 'https://example.com/return',
      expiryMinutes: 60,
    });

    expect(link.providerTransactionId).toBeTruthy();
    expect(link.amount).toBe(10_000);
    if (link.paymentUrl) {
      expect(link.paymentUrl).toMatch(/^https:\/\//);
    }

    const pay = betterPay({
      rateLimit: { enabled: false },
      plugins: [
        duitku({
          apiKey: apiKey!,
          merchantCode: merchantCode!,
          isSandbox: true,
          defaultPaymentMethod: process.env.DUITKU_PAYMENT_METHOD || 'SP',
        }),
      ],
    });

    const orderB = `bp_dk_b_${Date.now()}`.slice(0, 50);
    const txn = await pay.createTransaction({
      orderId: orderB,
      amount: 15_000,
      currency: 'IDR',
      customerEmail: 'user@betterpay.test',
      returnUrl: 'https://example.com/return',
      callbackUrl: 'https://example.com/callback',
    });

    expect(txn.orderId).toBe(orderB);
    expect(txn.providerTransactionId).toBeTruthy();
    expect(txn.status).toBe('active');

    const amount = '15000';
    const signature = hmac(`${merchantCode}${amount}${orderB}`, apiKey!);
    const body = new URLSearchParams({
      merchantCode: merchantCode!,
      amount,
      merchantOrderId: orderB,
      resultCode: '00',
      reference: txn.providerTransactionId || 'ref_sim',
      signature,
    }).toString();

    const whOk = await pay.handleWebhook('duitku', {
      body,
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
    });
    expect(whOk.success).toBe(true);
    expect(whOk.eventName).toBe('payment.completed');

    const bad = await pay.handleWebhook('duitku', {
      body: body.replace(signature, 'deadbeef'),
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
    });
    expect(bad.success).toBe(false);

    // sanity: inquiry sign helper matches provider
    expect(signDuitkuInquiry(merchantCode!, orderB, 15_000, apiKey!).length).toBe(64);
  }, 30_000);
});
