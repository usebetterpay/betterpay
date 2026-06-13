import { describe, it, expect } from 'vitest';
import { MayarProvider } from '../src/adapter';
import type { MayarConfig } from '../src/types';

const config: MayarConfig = {
  apiKey: 'test-api-key-12345',
  merchantId: 'merch_12345',
  isSandbox: true,
};

describe('MayarProvider', () => {
  it('should have correct id and name', () => {
    const provider = new MayarProvider(config);
    expect(provider.id).toBe('mayar');
    expect(provider.name).toBe('Mayar');
  });

  it('should support all Indonesian payment methods', () => {
    const provider = new MayarProvider(config);
    expect(provider.paymentMethods).toContain('virtual_account');
    expect(provider.paymentMethods).toContain('ewallet');
    expect(provider.paymentMethods).toContain('qris');
    expect(provider.paymentMethods).toContain('credit_card');
    expect(provider.paymentMethods).toContain('retail');
  });

  it('should have correct capabilities', () => {
    const provider = new MayarProvider(config);
    expect(provider.capabilities.paymentLink).toBe(true);
    expect(provider.capabilities.recurring).toBe(false);
    expect(provider.capabilities.refund).toBe(false);
    expect(provider.capabilities.virtualAccount).toBe(true);
    expect(provider.capabilities.ewallet).toBe(true);
    expect(provider.capabilities.qris).toBe(true);
    expect(provider.capabilities.creditCard).toBe(true);
    expect(provider.capabilities.retail).toBe(true);
  });

  it('should return sandbox endpoint when isSandbox=true', () => {
    const provider = new MayarProvider(config);
    expect(provider.getApiEndpoint()).toBe('https://api.mayar.club/hl/v1');
  });

  it('should return production endpoint when isSandbox=false', () => {
    const provider = new MayarProvider({ ...config, isSandbox: false });
    expect(provider.getApiEndpoint()).toBe('https://api.mayar.id/hl/v1');
  });

  it('should default to production endpoint', () => {
    const provider = new MayarProvider({ apiKey: 'key', merchantId: 'mid' });
    expect(provider.getApiEndpoint()).toBe('https://api.mayar.id/hl/v1');
  });

  describe('verifyWebhook', () => {
    it('should verify valid webhook', async () => {
      const provider = new MayarProvider(config);
      const payload = JSON.stringify({
        event: { received: 'payment.received' },
        data: { merchantId: 'merch_12345', id: 'wh_001', status: true },
      });

      const result = await provider.verifyWebhook({ body: payload, headers: {} });
      expect(result).toBe(true);
    });

    it('should reject wrong merchantId', async () => {
      const provider = new MayarProvider(config);
      const payload = JSON.stringify({
        event: { received: 'payment.received' },
        data: { merchantId: 'wrong', id: 'wh_001', status: true },
      });

      const result = await provider.verifyWebhook({ body: payload, headers: {} });
      expect(result).toBe(false);
    });
  });

  describe('normalizeWebhook', () => {
    it('should map payment.received to payment.completed', async () => {
      const provider = new MayarProvider(config);
      const payload = JSON.stringify({
        event: { received: 'payment.received' },
        data: { merchantId: 'merch_12345', id: 'wh_001', status: true, amount: 150000 },
      });

      const events = await provider.normalizeWebhook({ body: payload, headers: {} });
      expect(events).toHaveLength(1);
      expect(events[0]!.name).toBe('payment.completed');
      expect(events[0]!.payload.amount).toBe(150000);
    });

    it('should map payment.reminder to payment.pending', async () => {
      const provider = new MayarProvider(config);
      const payload = JSON.stringify({
        event: { received: 'payment.reminder' },
        data: { merchantId: 'merch_12345', id: 'wh_001', status: false },
      });

      const events = await provider.normalizeWebhook({ body: payload, headers: {} });
      expect(events[0]!.name).toBe('payment.pending');
    });

    it('should map membership.newMemberRegistered to subscription.created', async () => {
      const provider = new MayarProvider(config);
      const payload = JSON.stringify({
        event: { received: 'membership.newMemberRegistered' },
        data: { merchantId: 'merch_12345', id: 'wh_001', status: true },
      });

      const events = await provider.normalizeWebhook({ body: payload, headers: {} });
      expect(events[0]!.name).toBe('subscription.created');
    });

    it('should map membership.memberUnsubscribed to subscription.canceled', async () => {
      const provider = new MayarProvider(config);
      const payload = JSON.stringify({
        event: { received: 'membership.memberUnsubscribed' },
        data: { merchantId: 'merch_12345', id: 'wh_001', status: true },
      });

      const events = await provider.normalizeWebhook({ body: payload, headers: {} });
      expect(events[0]!.name).toBe('subscription.canceled');
    });

    it('should map unknown events to payment.updated', async () => {
      const provider = new MayarProvider(config);
      const payload = JSON.stringify({
        event: { received: 'shipper.status' },
        data: { merchantId: 'merch_12345', id: 'wh_001', status: true },
      });

      const events = await provider.normalizeWebhook({ body: payload, headers: {} });
      expect(events[0]!.name).toBe('payment.updated');
    });

    it('should include providerEventId', async () => {
      const provider = new MayarProvider(config);
      const payload = JSON.stringify({
        event: { received: 'payment.received' },
        data: { merchantId: 'merch_12345', id: 'wh_001', status: true },
      });

      const events = await provider.normalizeWebhook({ body: payload, headers: {} });
      expect(events[0]!.providerEventId).toBe('payment.received-wh_001');
    });
  });
});
