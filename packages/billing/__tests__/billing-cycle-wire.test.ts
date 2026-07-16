import { describe, it, expect, vi } from 'vitest';
import { billing, feature, plan } from '../src/index';
import type { BillingPluginData } from '@betterpay/core';

describe('billing __wireBillingCycle', () => {
  it('wires runner and marks past_due on payment failure', async () => {
    const messages = feature({ id: 'messages', type: 'boolean' });
    const pro = plan({
      id: 'pro',
      name: 'Pro',
      group: 'base',
      price: { amount: 100_000, currency: 'IDR', interval: 'month' },
      includes: [messages()],
    });

    const plugin = billing({ products: [pro] });
    const data = plugin.$Infer!.billing as BillingPluginData & {
      __wireBillingCycle: (deps: {
        createPaymentForSubscription: (
          sub: { id: string; customerId: string },
          plan: typeof pro,
        ) => Promise<{ paymentUrl: string; providerTransactionId: string }>;
        onPaymentFailure?: (id: string) => Promise<void>;
      }) => void;
      __services: {
        subscription: {
          subscribe: (i: unknown) => Promise<{ id: string }>;
        };
        repos: {
          subRepo: {
            update: (id: string, d: Record<string, unknown>) => Promise<unknown>;
            getById: (id: string) => Promise<{
              status: string;
              metadata?: Record<string, string> | null;
            } | undefined>;
          };
        };
      };
    };

    const createPay = vi.fn().mockRejectedValue(new Error('provider 503'));
    const onFail = vi.fn();

    data.__wireBillingCycle({
      createPaymentForSubscription: createPay,
      onPaymentFailure: onFail,
    });

    // Create active sub with period already ended
    const sub = await data.__services.subscription.subscribe({
      customerId: 'cust_1',
      plan: pro,
      periodStart: new Date('2020-01-01'),
      periodEnd: new Date('2020-02-01'),
    });
    // Force active + due (paid plans start scheduled — activate via repo)
    await data.__services.repos.subRepo.update(sub.id, {
      status: 'active',
      currentPeriodStartAt: new Date('2020-01-01'),
      currentPeriodEndAt: new Date('2020-02-01'),
    });

    const result = await data.billingCycle.run(new Date('2020-03-01'));
    expect(result.processed).toBe(1);
    expect(result.failed).toBe(1);
    expect(createPay).toHaveBeenCalled();
    expect(onFail).toHaveBeenCalledWith(sub.id);

    const after = await data.__services.repos.subRepo.getById(sub.id);
    expect(after?.status).toBe('past_due');
    expect(after?.metadata?.dunning_stage).toBe('retrying');
  });

  it('succeeds renewal when payment works', async () => {
    const messages = feature({ id: 'messages', type: 'boolean' });
    const pro = plan({
      id: 'pro',
      name: 'Pro',
      group: 'base',
      price: { amount: 100_000, currency: 'IDR', interval: 'month' },
      includes: [messages()],
    });

    const plugin = billing({ products: [pro] });
    const data = plugin.$Infer!.billing as BillingPluginData & {
      __wireBillingCycle: (deps: {
        createPaymentForSubscription: () => Promise<{
          paymentUrl: string;
          providerTransactionId: string;
        }>;
      }) => void;
      __services: {
        subscription: {
          subscribe: (i: unknown) => Promise<{ id: string }>;
        };
        repos: {
          subRepo: {
            update: (id: string, d: Record<string, unknown>) => Promise<unknown>;
            getById: (id: string) => Promise<{ status: string; currentPeriodEndAt: Date | null }>;
          };
        };
      };
    };

    data.__wireBillingCycle({
      createPaymentForSubscription: async () => ({
        paymentUrl: 'https://pay.example/r',
        providerTransactionId: 'ptx_1',
      }),
    });

    const sub = await data.__services.subscription.subscribe({
      customerId: 'cust_2',
      plan: pro,
    });
    await data.__services.repos.subRepo.update(sub.id, {
      status: 'active',
      currentPeriodStartAt: new Date('2020-01-01'),
      currentPeriodEndAt: new Date('2020-02-01'),
    });

    const result = await data.billingCycle.run(new Date('2020-03-01'));
    expect(result.processed).toBe(1);
    expect(result.succeeded).toBe(1);
    expect(result.failed).toBe(0);

    const updated = await data.__services.repos.subRepo.getById(sub.id);
    expect(updated?.status).toBe('active');
    expect(updated?.currentPeriodEndAt?.getTime()).toBeGreaterThan(
      new Date('2020-02-01').getTime(),
    );
  });
});
