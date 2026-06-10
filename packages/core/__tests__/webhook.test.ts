import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebhookHandler } from '../src/webhook/handler';
import type { PaymentProvider, NormalizedWebhookEvent } from '../src/provider/interface';

// ── Helpers ─────────────────────────────────────────────────────────────────

function createMockProvider(overrides?: Partial<PaymentProvider>): PaymentProvider {
  const normalizedEvent: NormalizedWebhookEvent = {
    name: 'payment.completed',
    payload: { order_id: 'order_001', amount: 100000 },
    providerEventId: 'evt_123',
  };
  return {
    id: 'test-provider',
    name: 'Test Provider',
    paymentMethods: ['virtual_account'],
    capabilities: { paymentLink: true, recurring: false, refund: false },
    createPaymentLink: vi.fn(),
    verifyWebhook: vi.fn().mockResolvedValue(true),
    normalizeWebhook: vi.fn().mockResolvedValue([normalizedEvent]),
    getApiEndpoint: () => 'https://api.test.com',
    ...overrides,
  };
}

function createMockTxService() {
  const transactions = new Map<string, { status: string; orderId: string }>();
  return {
    transactions,
    async getByOrderId(orderId: string) {
      return transactions.get(orderId);
    },
    async updateStatus(orderId: string, status: string) {
      const txn = transactions.get(orderId);
      if (txn) txn.status = status;
      return txn;
    },
    async create(data: any) {
      const record = { orderId: data.orderId, status: 'pending', ...data };
      transactions.set(data.orderId, record);
      return record;
    },
  };
}

describe('WebhookHandler', () => {
  let provider: PaymentProvider;
  let txService: ReturnType<typeof createMockTxService>;
  let handler: WebhookHandler;

  beforeEach(() => {
    provider = createMockProvider();
    txService = createMockTxService();
    handler = new WebhookHandler({
      providers: [provider],
      transactionService: txService as any,
    });
  });

  it('should process a valid webhook and update transaction', async () => {
    // Setup: create a transaction first
    await txService.create({ orderId: 'order_001', amount: 100000 });

    const result = await handler.handle('test-provider', {
      body: JSON.stringify({ order_id: 'order_001', status: 'completed' }),
      headers: { 'x-signature': 'valid_sig' },
    });

    expect(result.success).toBe(true);
    expect(result.eventName).toBe('payment.completed');
    expect(txService.transactions.get('order_001')!.status).toBe('completed');
  });

  it('should reject webhook with invalid signature', async () => {
    (provider.verifyWebhook as ReturnType<typeof vi.fn>).mockResolvedValue(false);

    const result = await handler.handle('test-provider', {
      body: JSON.stringify({ order_id: 'order_001' }),
      headers: { 'x-signature': 'bad_sig' },
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('signature');
  });

  it('should reject webhook for unknown provider', async () => {
    const result = await handler.handle('unknown-provider', {
      body: '{}',
      headers: {},
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Unknown provider');
  });

  it('should handle idempotency - skip already-processed events', async () => {
    // The mock provider's normalizeWebhook returns order_id='order_001' in the payload
    await txService.create({ orderId: 'order_001', amount: 100000 });

    // First processing
    const first = await handler.handle('test-provider', {
      body: JSON.stringify({ order_id: 'order_001', status: 'completed' }),
      headers: { 'x-signature': 'valid_sig' },
    });
    expect(first.success).toBe(true);

    // Second processing of the same event (same providerEventId)
    const second = await handler.handle('test-provider', {
      body: JSON.stringify({ order_id: 'order_001', status: 'completed' }),
      headers: { 'x-signature': 'valid_sig' },
    });
    expect(second.success).toBe(true);
    expect(second.duplicate).toBe(true);
  });

  it('should handle webhook for transaction not found', async () => {
    const result = await handler.handle('test-provider', {
      body: JSON.stringify({ order_id: 'nonexistent', status: 'completed' }),
      headers: { 'x-signature': 'valid_sig' },
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Transaction not found');
  });
});
