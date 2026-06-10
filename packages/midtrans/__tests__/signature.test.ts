import { describe, it, expect } from 'vitest';
import { verifyMidtransSignature, extractMidtransSignature } from '../src/signature';
import { createHash } from 'node:crypto';

describe('Midtrans Signature', () => {
  const serverKey = 'test-server-key-123';

  function buildPayload(orderId: string, statusCode: string, grossAmount: string) {
    return JSON.stringify({
      order_id: orderId,
      status_code: statusCode,
      gross_amount: grossAmount,
      signature_key: '', // will be filled
    });
  }

  function computeSignature(orderId: string, statusCode: string, grossAmount: string, key: string) {
    return createHash('sha512')
      .update(`${orderId}${statusCode}${grossAmount}${key}`, 'utf8')
      .digest('hex');
  }

  it('should verify valid signature', () => {
    const orderId = 'order_001';
    const statusCode = '200';
    const grossAmount = '100000';
    const sig = computeSignature(orderId, statusCode, grossAmount, serverKey);
    const payload = buildPayload(orderId, statusCode, grossAmount);

    expect(verifyMidtransSignature(payload, sig, serverKey)).toBe(true);
  });

  it('should reject invalid signature', () => {
    const payload = buildPayload('order_001', '200', '100000');
    expect(verifyMidtransSignature(payload, 'bad_signature', serverKey)).toBe(false);
  });

  it('should reject empty inputs', () => {
    expect(verifyMidtransSignature('', 'sig', 'key')).toBe(false);
    expect(verifyMidtransSignature('payload', '', 'key')).toBe(false);
    expect(verifyMidtransSignature('payload', 'sig', '')).toBe(false);
  });

  it('should reject invalid JSON', () => {
    expect(verifyMidtransSignature('not-json', 'sig', serverKey)).toBe(false);
  });

  it('should extract signature from payload', () => {
    const payload = JSON.stringify({
      order_id: 'test',
      signature_key: 'extracted_sig',
    });
    expect(extractMidtransSignature(payload)).toBe('extracted_sig');
  });

  it('should return undefined when no signature_key', () => {
    expect(extractMidtransSignature(JSON.stringify({ order_id: 'test' }))).toBeUndefined();
  });
});
