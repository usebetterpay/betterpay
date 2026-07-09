/**
 * Live sandbox smoke test.
 * Run: SUMOPOD_API_KEY=… pnpm --filter @betterpay/sumopod test:sandbox
 * Or default vitest run when SUMOPOD_API_KEY is set.
 */
import { describe, it, expect } from 'vitest';
import { SumopodProvider } from '../src/adapter';

const apiKey = process.env.SUMOPOD_API_KEY;
const describeLive = apiKey ? describe : describe.skip;

describeLive('SumoPod sandbox (live)', () => {
  it('creates a real payment link', async () => {
    const provider = new SumopodProvider({
      apiKey: apiKey!,
      isSandbox: true,
      // webhook secrets not needed for create
      webhookToken: 'whtok_unused_for_create',
    });

    const orderId = `bp_sbx_${Date.now()}`;
    const result = await provider.createPaymentLink({
      orderId,
      amount: 10_000,
      currency: 'IDR',
      customerEmail: 'sandbox@betterpay.test',
      description: 'BetterPay SumoPod sandbox smoke',
      callbackUrl: 'https://example.com/cancel',
      returnUrl: 'https://example.com/success',
      expiryMinutes: 60,
    });

    expect(result.providerTransactionId).toMatch(
      /^[0-9a-f-]{36}$/i,
    );
    expect(result.amount).toBe(10_000);
    expect(result.currency).toBe('IDR');
    // sandbox usually returns a hosted payment link
    if (result.paymentUrl) {
      expect(result.paymentUrl).toMatch(/^https:\/\//);
    }
    expect(['pending', 'active']).toContain(result.status);
    expect(result.raw).toMatchObject({
      order_id: orderId,
      payment_id: result.providerTransactionId,
    });
  });
});
