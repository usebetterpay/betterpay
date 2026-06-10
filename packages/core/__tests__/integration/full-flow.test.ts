// ── Integration Test: Full payment flow ──────────────────────────────────
// Tests: createBetterPay → createTransaction → webhook → status
// Uses mock HTTP (no real provider APIs).

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { betterPay } from '../../src/create-betterpay';
import type { PaymentProvider, NormalizedWebhookEvent } from '../../src/provider/interface';

// ── Mock provider that doesn't make real HTTP calls ────────────────────────

function createMockProvider(): PaymentProvider & { priority?: number } {
  return {
    id: 'mock',
    name: 'Mock Provider',
    paymentMethods: ['virtual_account', 'qris'],
    capabilities: {
      paymentLink: true,
      recurring: false,
      refund: false,
      virtualAccount: true,
      qris: true,
    },
    priority: 1,

    getApiEndpoint: () => 'https://api.mock.test',

    createPaymentLink: vi.fn().mockResolvedValue({
      providerTransactionId: 'mock_prov_txn_001',
      paymentUrl: 'https://checkout.mock.test/pay/abc123',
      amount: 100000,
      currency: 'IDR',
      status: 'active' as const,
      raw: { token: 'mock_token' },
    }),

    verifyWebhook: vi.fn().mockResolvedValue(true),

    normalizeWebhook: vi.fn().mockImplementation(async (data: { body: string }) => {
      const parsed = JSON.parse(data.body);
      const status = parsed.status ?? 'completed';
      const events: NormalizedWebhookEvent[] = [
        {
          name: `payment.${status}`,
          payload: parsed,
          providerEventId: parsed.event_id ?? `evt_${Math.random().toString(36).slice(2)}`,
        },
      ];
      return events;
    }),

    checkStatus: vi.fn().mockResolvedValue({
      providerTransactionId: 'mock_prov_txn_001',
      status: 'completed' as const,
      amount: 100000,
      currency: 'IDR',
      raw: {},
    }),
  };
}

describe('Integration: Full Payment Flow', () => {
  let pay: ReturnType<typeof betterPay>;

  beforeEach(() => {
    const mockProvider = createMockProvider();
    pay = betterPay({
      plugins: [
        {
          id: 'mock-plugin',
          providers: [mockProvider],
        },
      ],
    });
  });

  it('should complete full payment lifecycle', async () => {
    // 1. Create transaction
    const txn = await pay.createTransaction({
      orderId: 'order_int_001',
      amount: 100000,
      customerEmail: 'test@example.com',
      description: 'Integration test payment',
      returnUrl: 'https://myapp.com/success',
    });

    expect(txn.orderId).toBe('order_int_001');
    expect(txn.status).toBe('active');
    expect(txn.paymentUrl).toBe('https://checkout.mock.test/pay/abc123');
    expect(txn.providerTransactionId).toBe('mock_prov_txn_001');

    // 2. Check status — should be active
    let status = await pay.getStatus('order_int_001');
    expect(status).not.toBeNull();
    expect(status!.status).toBe('active');
    expect(status!.amount).toBe(100000);

    // 3. Simulate webhook from provider (payment completed)
    const webhookResult = await pay.handleWebhook('mock', {
      body: JSON.stringify({
        order_id: 'order_int_001',
        status: 'completed',
        amount: 100000,
        event_id: 'evt_001',
      }),
      headers: { 'x-signature': 'valid' },
    });

    expect(webhookResult.success).toBe(true);
    expect(webhookResult.eventName).toBe('payment.completed');

    // 4. Check status — should now be completed
    status = await pay.getStatus('order_int_001');
    expect(status!.status).toBe('completed');
  });

  it('should handle webhook idempotency', async () => {
    await pay.createTransaction({
      orderId: 'order_int_002',
      amount: 50000,
      customerEmail: 'user@test.com',
    });

    // First webhook
    const first = await pay.handleWebhook('mock', {
      body: JSON.stringify({
        order_id: 'order_int_002',
        status: 'completed',
        event_id: 'evt_002',
      }),
      headers: {},
    });
    expect(first.success).toBe(true);

    // Duplicate webhook
    const second = await pay.handleWebhook('mock', {
      body: JSON.stringify({
        order_id: 'order_int_002',
        status: 'completed',
        event_id: 'evt_002',
      }),
      headers: {},
    });
    expect(second.success).toBe(true);

    // Status should still be completed (no double-processing)
    const status = await pay.getStatus('order_int_002');
    expect(status!.status).toBe('completed');
  });

  it('should handle multiple transactions concurrently', async () => {
    const orders = await Promise.all([
      pay.createTransaction({
        orderId: 'order_concurrent_1',
        amount: 10000,
        customerEmail: 'a@test.com',
      }),
      pay.createTransaction({
        orderId: 'order_concurrent_2',
        amount: 20000,
        customerEmail: 'b@test.com',
      }),
      pay.createTransaction({
        orderId: 'order_concurrent_3',
        amount: 30000,
        customerEmail: 'c@test.com',
      }),
    ]);

    expect(orders).toHaveLength(3);
    expect(orders[0]!.orderId).toBe('order_concurrent_1');
    expect(orders[1]!.orderId).toBe('order_concurrent_2');
    expect(orders[2]!.orderId).toBe('order_concurrent_3');

    // All should be active
    for (const order of orders) {
      const status = await pay.getStatus(order.orderId);
      expect(status!.status).toBe('active');
    }
  });

  it('should reject webhook for unknown provider', async () => {
    const result = await pay.handleWebhook('unknown-provider', {
      body: '{}',
      headers: {},
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain('Unknown provider');
  });

  it('should return null for non-existent transaction', async () => {
    const status = await pay.getStatus('nonexistent');
    expect(status).toBeNull();
  });
});
