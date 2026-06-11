import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TripayProvider } from '../src/adapter';
import type { TripayConfig } from '../src/types';

describe('TripayProvider', () => {
  let provider: TripayProvider;
  let config: TripayConfig;

  beforeEach(() => {
    config = {
      apiKey: 'test_api_key',
      privateKey: 'test_private_key',
      merchantCode: 'T0001',
      isSandbox: true,
    };
    provider = new TripayProvider(config);
  });

  describe('constructor', () => {
    it('should create provider with default sandbox mode', () => {
      const provider = new TripayProvider({
        apiKey: 'test',
        privateKey: 'test',
        merchantCode: 'T0001',
      });

      expect(provider.id).toBe('tripay');
      expect(provider.name).toBe('Tripay');
    });

    it('should create provider with explicit sandbox mode', () => {
      const provider = new TripayProvider({
        apiKey: 'test',
        privateKey: 'test',
        merchantCode: 'T0001',
        isSandbox: true,
      });

      expect(provider.id).toBe('tripay');
    });

    it('should create provider with production mode', () => {
      const provider = new TripayProvider({
        apiKey: 'test',
        privateKey: 'test',
        merchantCode: 'T0001',
        isSandbox: false,
      });

      expect(provider.id).toBe('tripay');
    });
  });

  describe('paymentMethods', () => {
    it('should have correct payment methods', () => {
      expect(provider.paymentMethods).toEqual([
        'virtual_account',
        'ewallet',
        'qris',
        'retail',
      ]);
    });
  });

  describe('capabilities', () => {
    it('should have correct capabilities', () => {
      expect(provider.capabilities).toEqual({
        paymentLink: true,
        recurring: false,
        refund: false,
        virtualAccount: true,
        ewallet: true,
        qris: true,
        retail: true,
      });
    });
  });

  describe('getApiEndpoint', () => {
    it('should return sandbox URL when isSandbox is true', () => {
      const sandboxProvider = new TripayProvider({
        apiKey: 'test',
        privateKey: 'test',
        merchantCode: 'T0001',
        isSandbox: true,
      });

      expect(sandboxProvider.getApiEndpoint()).toBe('https://tripay.co.id/api-sandbox');
    });

    it('should return production URL when isSandbox is false', () => {
      const prodProvider = new TripayProvider({
        apiKey: 'test',
        privateKey: 'test',
        merchantCode: 'T0001',
        isSandbox: false,
      });

      expect(prodProvider.getApiEndpoint()).toBe('https://tripay.co.id/api');
    });
  });

  describe('getSupportedPaymentMethods', () => {
    it('should return list of supported payment methods', () => {
      const methods = provider.getSupportedPaymentMethods();

      expect(methods).toBeInstanceOf(Array);
      expect(methods.length).toBeGreaterThan(0);
      expect(methods).toContain('BRIVA');
      expect(methods).toContain('BCAVA');
      expect(methods).toContain('MANDIRIVA');
      expect(methods).toContain('QRIS');
      expect(methods).toContain('OVO');
      expect(methods).toContain('DANA');
    });

    it('should include virtual account methods', () => {
      const methods = provider.getSupportedPaymentMethods();

      expect(methods).toContain('PERMATAVA');
      expect(methods).toContain('BNIVA');
      expect(methods).toContain('BRIVA');
      expect(methods).toContain('MANDIRIVA');
      expect(methods).toContain('BCAVA');
    });

    it('should include retail methods', () => {
      const methods = provider.getSupportedPaymentMethods();

      expect(methods).toContain('ALFAMART');
      expect(methods).toContain('INDOMARET');
    });

    it('should include e-wallet methods', () => {
      const methods = provider.getSupportedPaymentMethods();

      expect(methods).toContain('OVO');
      expect(methods).toContain('DANA');
      expect(methods).toContain('SHOPEEPAY');
    });

    it('should include QRIS methods', () => {
      const methods = provider.getSupportedPaymentMethods();

      expect(methods).toContain('QRIS');
      expect(methods).toContain('QRISC');
      expect(methods).toContain('QRIS2');
    });
  });

  describe('checkStatus', () => {
    it('should return correct status for PAID transaction', async () => {
      // Mock fetch
      const mockResponse = {
        success: true,
        data: {
          reference: 'T0001000000000000006',
          merchant_ref: 'INV364654',
          payment_selection_type: 'static',
          payment_method: 'BRIVA',
          payment_name: 'BRI Virtual Account',
          customer_name: 'Test Customer',
          customer_email: 'test@example.com',
          amount: 200000,
          fee_merchant: 4500,
          fee_customer: 0,
          total_fee: 4500,
          amount_received: 195500,
          pay_code: '1234567890',
          checkout_url: 'https://tripay.co.id/checkout/T0001000000000000006',
          status: 'PAID',
          expired_time: 1608133017,
          order_items: [],
          paid_at: 1608133017,
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        json: () => Promise.resolve(mockResponse),
      });

      const result = await provider.checkStatus('T0001000000000000006');

      expect(result.providerTransactionId).toBe('T0001000000000000006');
      expect(result.status).toBe('completed');
      expect(result.amount).toBe(200000);
      expect(result.currency).toBe('IDR');
      expect(result.paidAt).toBeDefined();
    });

    it('should return correct status for EXPIRED transaction', async () => {
      const mockResponse = {
        success: true,
        data: {
          reference: 'T0001000000000000007',
          merchant_ref: 'INV364655',
          payment_selection_type: 'static',
          payment_method: 'BRIVA',
          payment_name: 'BRI Virtual Account',
          customer_name: 'Test Customer',
          customer_email: 'test@example.com',
          amount: 100000,
          fee_merchant: 4500,
          fee_customer: 0,
          total_fee: 4500,
          amount_received: 95500,
          pay_code: '0987654321',
          checkout_url: 'https://tripay.co.id/checkout/T0001000000000000007',
          status: 'EXPIRED',
          expired_time: 1608133017,
          order_items: [],
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        json: () => Promise.resolve(mockResponse),
      });

      const result = await provider.checkStatus('T0001000000000000007');

      expect(result.providerTransactionId).toBe('T0001000000000000007');
      expect(result.status).toBe('expired');
      expect(result.amount).toBe(100000);
      expect(result.paidAt).toBeUndefined();
    });

    it('should throw error when API returns error', async () => {
      const mockResponse = {
        success: false,
        message: 'Transaction not found',
      };

      global.fetch = vi.fn().mockResolvedValue({
        json: () => Promise.resolve(mockResponse),
      });

      await expect(provider.checkStatus('invalid')).rejects.toThrow(
        'Tripay API Error: Transaction not found'
      );
    });
  });

  describe('verifyWebhook', () => {
    it('should verify valid webhook signature', async () => {
      const payload = JSON.stringify({
        reference: 'T0001000000000000006',
        merchant_ref: 'INV364654',
        status: 'PAID',
      });

      // Generate valid signature
      const crypto = require('crypto');
      const signature = crypto
        .createHmac('sha256', config.privateKey)
        .update(payload)
        .digest('hex');

      const result = await provider.verifyWebhook({
        body: payload,
        headers: {
          'x-callback-signature': signature,
          'x-callback-event': 'payment_status',
        },
      });

      expect(result).toBe(true);
    });

    it('should reject invalid webhook signature', async () => {
      const payload = JSON.stringify({
        reference: 'T0001000000000000006',
        status: 'PAID',
      });

      const result = await provider.verifyWebhook({
        body: payload,
        headers: {
          'x-callback-signature': 'invalid_signature',
          'x-callback-event': 'payment_status',
        },
      });

      expect(result).toBe(false);
    });

    it('should reject webhook with wrong event type', async () => {
      const payload = JSON.stringify({
        reference: 'T0001000000000000006',
        status: 'PAID',
      });

      const crypto = require('crypto');
      const signature = crypto
        .createHmac('sha256', config.privateKey)
        .update(payload)
        .digest('hex');

      const result = await provider.verifyWebhook({
        body: payload,
        headers: {
          'x-callback-signature': signature,
          'x-callback-event': 'wrong_event',
        },
      });

      expect(result).toBe(false);
    });

    it('should reject webhook with missing signature', async () => {
      const payload = JSON.stringify({
        reference: 'T0001000000000000006',
        status: 'PAID',
      });

      const result = await provider.verifyWebhook({
        body: payload,
        headers: {
          'x-callback-signature': '',
          'x-callback-event': 'payment_status',
        },
      });

      expect(result).toBe(false);
    });
  });

  describe('parseWebhook', () => {
    it('should parse webhook payload correctly', () => {
      const payload = JSON.stringify({
        reference: 'T0001000000000000006',
        merchant_ref: 'INV364654',
        payment_method: 'BCA Virtual Account',
        payment_method_code: 'BCAVA',
        total_amount: 200000,
        fee_merchant: 2000,
        fee_customer: 0,
        total_fee: 2000,
        amount_received: 198000,
        is_closed_payment: 1,
        status: 'PAID',
        paid_at: 1608133017,
        note: null,
      });

      const result = provider.parseWebhook(payload);

      expect(result.reference).toBe('T0001000000000000006');
      expect(result.merchant_ref).toBe('INV364654');
      expect(result.status).toBe('PAID');
      expect(result.total_amount).toBe(200000);
      expect(result.is_closed_payment).toBe(1);
    });

    it('should handle webhook with optional fields', () => {
      const payload = JSON.stringify({
        reference: 'T0001000000000000006',
        merchant_ref: 'INV364654',
        status: 'EXPIRED',
        total_amount: 100000,
        is_closed_payment: 0,
      });

      const result = provider.parseWebhook(payload);

      expect(result.status).toBe('EXPIRED');
      expect(result.paid_at).toBeUndefined();
      expect(result.note).toBeUndefined();
    });
  });

  describe('normalizeWebhook', () => {
    it('should normalize PAID webhook to payment.completed', async () => {
      const payload = JSON.stringify({
        reference: 'T0001000000000000006',
        merchant_ref: 'INV364654',
        status: 'PAID',
        total_amount: 200000,
      });

      const result = await provider.normalizeWebhook({
        body: payload,
        headers: {},
      });

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('payment.completed');
      expect(result[0].providerEventId).toBe('T0001000000000000006');
    });

    it('should normalize EXPIRED webhook to payment.expired', async () => {
      const payload = JSON.stringify({
        reference: 'T0001000000000000007',
        merchant_ref: 'INV364655',
        status: 'EXPIRED',
        total_amount: 100000,
      });

      const result = await provider.normalizeWebhook({
        body: payload,
        headers: {},
      });

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('payment.expired');
      expect(result[0].providerEventId).toBe('T0001000000000000007');
    });

    it('should normalize FAILED webhook to payment.failed', async () => {
      const payload = JSON.stringify({
        reference: 'T0001000000000000008',
        merchant_ref: 'INV364656',
        status: 'FAILED',
        total_amount: 150000,
      });

      const result = await provider.normalizeWebhook({
        body: payload,
        headers: {},
      });

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('payment.failed');
      expect(result[0].providerEventId).toBe('T0001000000000000008');
    });

    it('should normalize REFUND webhook to payment.refunded', async () => {
      const payload = JSON.stringify({
        reference: 'T0001000000000000009',
        merchant_ref: 'INV364657',
        status: 'REFUND',
        total_amount: 50000,
      });

      const result = await provider.normalizeWebhook({
        body: payload,
        headers: {},
      });

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('payment.refunded');
      expect(result[0].providerEventId).toBe('T0001000000000000009');
    });

    it('should normalize unknown status to payment.updated', async () => {
      const payload = JSON.stringify({
        reference: 'T0001000000000000010',
        merchant_ref: 'INV364658',
        status: 'UNKNOWN_STATUS',
        total_amount: 75000,
      });

      const result = await provider.normalizeWebhook({
        body: payload,
        headers: {},
      });

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('payment.updated');
      expect(result[0].providerEventId).toBe('T0001000000000000010');
    });
  });
});
