import { describe, it, expect, vi } from 'vitest';
import { ProviderRegistry } from '../src/provider/registry';
import type { PaymentProvider } from '../src/provider/interface';

// Helper: create a mock provider with optional priority
function createMockProvider(id: string, priority?: number): PaymentProvider & { priority?: number } {
  return {
    id,
    name: `Mock ${id}`,
    paymentMethods: ['virtual_account'],
    capabilities: { paymentLink: true, recurring: false, refund: false },
    createPaymentLink: vi.fn(),
    verifyWebhook: vi.fn(),
    normalizeWebhook: vi.fn(),
    getApiEndpoint: () => `https://${id}.test.com`,
    priority,
  };
}

describe('ProviderRegistry', () => {
  it('should register and retrieve providers', () => {
    const registry = new ProviderRegistry();
    const provider = createMockProvider('test');

    registry.register(provider);

    expect(registry.get('test')).toBe(provider);
    expect(registry.list()).toHaveLength(1);
  });

  it('should return default provider (highest priority = lowest number)', () => {
    const registry = new ProviderRegistry();
    const low = createMockProvider('low', 3);
    const high = createMockProvider('high', 1);
    const mid = createMockProvider('mid', 2);

    registry.register(low);
    registry.register(high);
    registry.register(mid);

    expect(registry.getDefault()).toBe(high);
  });

  it('should find providers by payment method', () => {
    const registry = new ProviderRegistry();
    const vaProvider: PaymentProvider = {
      ...createMockProvider('va'),
      paymentMethods: ['virtual_account', 'qris'],
    };
    const ccProvider: PaymentProvider = {
      ...createMockProvider('cc'),
      paymentMethods: ['credit_card'],
    };

    registry.register(vaProvider);
    registry.register(ccProvider);

    const vaProviders = registry.findByMethod('virtual_account');
    expect(vaProviders).toHaveLength(1);
    expect(vaProviders[0]).toBe(vaProvider);
  });

  it('should select provider for subscribe based on priority', () => {
    const registry = new ProviderRegistry();
    const primary = createMockProvider('primary', 1);
    const fallback = createMockProvider('fallback', 2);

    registry.register(primary);
    registry.register(fallback);

    const selected = registry.selectForSubscribe({});
    expect(selected).toBe(primary);
  });

  it('should select provider by payment method', () => {
    const registry = new ProviderRegistry();
    const vaProvider: PaymentProvider & { priority?: number } = {
      ...createMockProvider('va', 2),
      paymentMethods: ['virtual_account'],
    };
    const ccProvider: PaymentProvider & { priority?: number } = {
      ...createMockProvider('cc', 1),
      paymentMethods: ['credit_card'],
    };

    registry.register(vaProvider);
    registry.register(ccProvider);

    const selected = registry.selectForSubscribe({ paymentMethod: 'virtual_account' });
    expect(selected).toBe(vaProvider);
  });

  it('should throw when no provider available', () => {
    const registry = new ProviderRegistry();

    expect(() => registry.getDefault()).toThrow('No providers registered');
  });

  it('should throw when no provider supports requested method', () => {
    const registry = new ProviderRegistry();
    const vaProvider = createMockProvider('va', 1);
    registry.register(vaProvider);

    expect(() => registry.selectForSubscribe({ paymentMethod: 'credit_card' }))
      .toThrow('No provider supports payment method: credit_card');
  });
});
