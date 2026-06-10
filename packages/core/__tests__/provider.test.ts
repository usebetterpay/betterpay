import { describe, it, expect } from 'vitest';
import type { PaymentProvider, ProviderCapabilities, PaymentMethod } from '../src/provider/interface';

describe('PaymentProvider', () => {
  it('should define minimal provider with required methods', () => {
    const provider: PaymentProvider = {
      id: 'test',
      name: 'Test Provider',
      paymentMethods: ['virtual_account'],
      capabilities: {
        paymentLink: true,
        recurring: false,
        refund: false,
      },
      createPaymentLink: async (data) => ({
        providerTransactionId: 'test_123',
        paymentUrl: 'https://test.com/pay',
        amount: data.amount,
        currency: data.currency,
        status: 'active' as const,
        raw: {},
      }),
      verifyWebhook: async () => true,
      normalizeWebhook: async () => [],
      getApiEndpoint: () => 'https://api.test.com',
    };

    expect(provider.id).toBe('test');
    expect(provider.capabilities.paymentLink).toBe(true);
    expect(provider.paymentMethods).toContain('virtual_account');
  });

  it('should accept provider with optional methods', () => {
    const provider: PaymentProvider = {
      id: 'full',
      name: 'Full Provider',
      paymentMethods: ['credit_card', 'ewallet'],
      capabilities: {
        paymentLink: true,
        recurring: true,
        refund: true,
      },
      createPaymentLink: async () => ({
        providerTransactionId: '',
        amount: 0,
        currency: 'IDR',
        status: 'active' as const,
        raw: {},
      }),
      verifyWebhook: async () => true,
      normalizeWebhook: async () => [],
      getApiEndpoint: () => '',
      checkStatus: async () => ({
        providerTransactionId: '',
        status: 'completed' as const,
        amount: 0,
        currency: 'IDR',
        raw: {},
      }),
      cancelTransaction: async () => {},
    };

    expect(provider.checkStatus).toBeDefined();
    expect(provider.cancelTransaction).toBeDefined();
  });

  it('should validate payment method types', () => {
    const methods: PaymentMethod[] = [
      'virtual_account', 'ewallet', 'qris', 'credit_card',
      'retail', 'paylater', 'bank_transfer',
    ];
    expect(methods).toHaveLength(7);
  });

  it('should define provider capabilities', () => {
    const caps: ProviderCapabilities = {
      paymentLink: true,
      recurring: false,
      refund: false,
      virtualAccount: true,
      ewallet: true,
      qris: true,
    };
    expect(caps.paymentLink).toBe(true);
    expect(caps.recurring).toBe(false);
  });
});
