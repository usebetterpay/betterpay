import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProviderRegistry } from '../src/provider/registry';
import { createPaymentLinkWithResilience } from '../src/provider/execute-with-resilience';
import { createCircuitBreaker } from '../src/utils/circuit-breaker';
import type { PaymentProvider, PaymentLinkResult } from '../src/provider/interface';
import { betterPay } from '../src/create-betterpay';

function mockProvider(
  id: string,
  createFn: PaymentProvider['createPaymentLink'],
  priority = 10,
): PaymentProvider & { priority: number } {
  return {
    id,
    name: id,
    priority,
    paymentMethods: ['qris'],
    capabilities: { paymentLink: true, recurring: false, refund: false },
    createPaymentLink: createFn,
    verifyWebhook: async () => true,
    normalizeWebhook: async () => [],
    getApiEndpoint: () => 'https://example.com',
  };
}

const okResult = (id: string): PaymentLinkResult => ({
  providerTransactionId: id,
  paymentUrl: `https://pay.example/${id}`,
  amount: 10_000,
  currency: 'IDR',
  status: 'pending',
  raw: {},
});

describe('createPaymentLinkWithResilience', () => {
  let registry: ProviderRegistry;
  let breakers: Map<string, ReturnType<typeof createCircuitBreaker>>;

  beforeEach(() => {
    registry = new ProviderRegistry();
    breakers = new Map();
  });

  it('retries then succeeds on the same provider', async () => {
    let calls = 0;
    registry.register(
      mockProvider('a', async () => {
        calls++;
        if (calls < 3) throw new Error('network timeout');
        return okResult('ok');
      }),
    );

    const { provider, result } = await createPaymentLinkWithResilience(
      registry,
      {
        orderId: 'o1',
        amount: 10_000,
        currency: 'IDR',
        customerEmail: 'a@b.c',
        description: 't',
        callbackUrl: '',
        returnUrl: '',
      },
      {
        breakers,
        failover: false,
        retry: { maxAttempts: 3, baseDelayMs: 1, maxDelayMs: 5, jitter: false },
      },
    );

    expect(provider.id).toBe('a');
    expect(result.providerTransactionId).toBe('ok');
    expect(calls).toBe(3);
  });

  it('fails over to next provider when failover: true', async () => {
    registry.register(
      mockProvider(
        'primary',
        async () => {
          throw new Error('provider 503');
        },
        1,
      ),
    );
    registry.register(
      mockProvider('backup', async () => okResult('backup-tx'), 2),
    );

    const { provider, result } = await createPaymentLinkWithResilience(
      registry,
      {
        orderId: 'o2',
        amount: 10_000,
        currency: 'IDR',
        customerEmail: 'a@b.c',
        description: 't',
        callbackUrl: '',
        returnUrl: '',
      },
      {
        breakers,
        failover: true,
        retry: { maxAttempts: 2, baseDelayMs: 1, maxDelayMs: 5, jitter: false },
      },
    );

    expect(provider.id).toBe('backup');
    expect(result.providerTransactionId).toBe('backup-tx');
  });

  it('does not fail over when failover: false', async () => {
    registry.register(
      mockProvider('primary', async () => {
        throw new Error('provider 503');
      }, 1),
    );
    registry.register(mockProvider('backup', async () => okResult('b'), 2));

    await expect(
      createPaymentLinkWithResilience(
        registry,
        {
          orderId: 'o3',
          amount: 10_000,
          currency: 'IDR',
          customerEmail: 'a@b.c',
          description: 't',
          callbackUrl: '',
          returnUrl: '',
        },
        {
          breakers,
          failover: false,
          retry: { maxAttempts: 2, baseDelayMs: 1, maxDelayMs: 5, jitter: false },
        },
      ),
    ).rejects.toThrow(/503|provider/i);
  });

  it('does not fail over on validation errors', async () => {
    registry.register(
      mockProvider('primary', async () => {
        throw new Error('invalid amount');
      }, 1),
    );
    registry.register(mockProvider('backup', async () => okResult('b'), 2));

    await expect(
      createPaymentLinkWithResilience(
        registry,
        {
          orderId: 'o4',
          amount: 10_000,
          currency: 'IDR',
          customerEmail: 'a@b.c',
          description: 't',
          callbackUrl: '',
          returnUrl: '',
        },
        {
          breakers,
          failover: true,
          retry: { maxAttempts: 3, baseDelayMs: 1, maxDelayMs: 5, jitter: false },
        },
      ),
    ).rejects.toThrow(/invalid amount/i);
  });
});

describe('betterPay createTransaction + reconciliation', () => {
  it('createTransaction uses provider and stores active txn', async () => {
    const createPaymentLink = vi.fn().mockResolvedValue(okResult('ext-1'));
    const pay = betterPay({
      rateLimit: { enabled: false },
      plugins: [
        {
          id: 'mock-provider',
          version: '0.0.1',
          providers: [
            mockProvider('mock', createPaymentLink),
          ],
        },
      ],
    });

    const result = await pay.createTransaction({
      orderId: 'order-res-1',
      amount: 50_000,
      customerEmail: 'u@test.com',
    });

    expect(result.status).toBe('active');
    expect(result.providerTransactionId).toBe('ext-1');
    expect(createPaymentLink).toHaveBeenCalled();

    const status = await pay.getStatus('order-res-1');
    expect(status?.status).toBe('active');
  });

  it('runReconciliation updates pending when provider says completed', async () => {
    const checkStatus = vi.fn().mockResolvedValue({
      providerTransactionId: 'ext-2',
      status: 'completed',
      amount: 50_000,
      currency: 'IDR',
      raw: {},
    });

    const pay = betterPay({
      rateLimit: { enabled: false },
      plugins: [
        {
          id: 'mock-provider',
          version: '0.0.1',
          providers: [
            {
              ...mockProvider('mock', async () => okResult('ext-2')),
              checkStatus,
            },
          ],
        },
      ],
    });

    await pay.createTransaction({
      orderId: 'order-recon-1',
      amount: 50_000,
      customerEmail: 'u@test.com',
    });

    // Widen age window: maxAge is "created after now - maxAgeHours"
    const run = await pay.runReconciliation();
    expect(run.totalChecked).toBeGreaterThanOrEqual(1);
    expect(checkStatus).toHaveBeenCalledWith('ext-2');
    expect(run.updated).toBe(1);

    const status = await pay.getStatus('order-recon-1');
    expect(status?.status).toBe('completed');
  });
});
