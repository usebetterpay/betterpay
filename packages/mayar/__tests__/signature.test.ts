import { describe, it, expect } from 'vitest';
import { verifyMayarWebhook, parseMayarWebhook } from '../src/signature';

const MERCHANT_ID = 'merch_12345';

const createWebhookPayload = (overrides: Record<string, unknown> = {}) => ({
  event: { received: 'payment.received' },
  data: {
    id: 'wh_001',
    status: true,
    createdAt: 1718000000000,
    updatedAt: 1718000100000,
    merchantId: MERCHANT_ID,
    merchantEmail: 'merchant@example.com',
    merchantName: 'Test Merchant',
    customerName: 'John Doe',
    customerEmail: 'john@example.com',
    customerMobile: '081234567890',
    amount: 150000,
    isAdminFeeBorneByCustomer: false,
    isChannelFeeBorneByCustomer: false,
    productId: 'prod_001',
    productName: 'Test Product',
    productType: 'digital',
    pixelFbp: '',
    pixelFbc: '',
    addOn: [],
    custom_field: [],
    ...overrides,
  },
});

describe('verifyMayarWebhook', () => {
  it('should verify when merchantId matches', () => {
    const payload = JSON.stringify(createWebhookPayload());
    expect(verifyMayarWebhook(payload, MERCHANT_ID)).toBe(true);
  });

  it('should reject when merchantId does not match', () => {
    const payload = JSON.stringify(createWebhookPayload());
    expect(verifyMayarWebhook(payload, 'wrong_merchant')).toBe(false);
  });

  it('should reject empty payload', () => {
    expect(verifyMayarWebhook('', MERCHANT_ID)).toBe(false);
  });

  it('should reject empty merchantId', () => {
    const payload = JSON.stringify(createWebhookPayload());
    expect(verifyMayarWebhook(payload, '')).toBe(false);
  });

  it('should reject invalid JSON', () => {
    expect(verifyMayarWebhook('not json', MERCHANT_ID)).toBe(false);
  });

  it('should reject when merchantId is missing in payload', () => {
    const payload = JSON.stringify({
      event: { received: 'payment.received' },
      data: { id: 'wh_001', status: true },
    });
    expect(verifyMayarWebhook(payload, MERCHANT_ID)).toBe(false);
  });
});

describe('parseMayarWebhook', () => {
  it('should parse valid payload', () => {
    const payload = JSON.stringify(createWebhookPayload());
    const parsed = parseMayarWebhook(payload);

    expect(parsed.event.received).toBe('payment.received');
    expect(parsed.data.merchantId).toBe(MERCHANT_ID);
    expect(parsed.data.amount).toBe(150000);
    expect(parsed.data.customerEmail).toBe('john@example.com');
  });

  it('should throw on invalid JSON', () => {
    expect(() => parseMayarWebhook('not json')).toThrow();
  });
});
