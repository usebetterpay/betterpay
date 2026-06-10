import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { verifyDuitkuSignature, extractDuitkuSignature, parseDuitkuPayload } from '../src/signature';

function sha256Hex(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex');
}

describe('Duitku Signature', () => {
  const apiKey = 'test-api-key-123';
  const merchantCode = 'DS1234';
  const amount = '100000';
  const orderId = 'order_001';

  function buildPayload(extra?: Record<string, string>) {
    const params = new URLSearchParams({
      merchantCode,
      amount,
      merchantOrderId: orderId,
      resultCode: '00',
      reference: 'ref_001',
      ...extra,
    });
    return params.toString();
  }

  function computeSignature() {
    return sha256Hex(`${merchantCode}${amount}${orderId}${apiKey}`);
  }

  it('should verify valid signature', () => {
    const payload = buildPayload();
    const sig = computeSignature();
    expect(verifyDuitkuSignature(payload, sig, apiKey)).toBe(true);
  });

  it('should reject invalid signature', () => {
    const payload = buildPayload();
    expect(verifyDuitkuSignature(payload, 'bad_sig', apiKey)).toBe(false);
  });

  it('should reject empty inputs', () => {
    expect(verifyDuitkuSignature('', 'sig', 'key')).toBe(false);
    expect(verifyDuitkuSignature('payload', '', 'key')).toBe(false);
    expect(verifyDuitkuSignature('payload', 'sig', '')).toBe(false);
  });

  it('should extract signature from payload', () => {
    const params = new URLSearchParams({
      merchantCode: 'test',
      signature: 'extracted_sig',
    });
    expect(extractDuitkuSignature(params.toString())).toBe('extracted_sig');
  });

  it('should return undefined when no signature', () => {
    const params = new URLSearchParams({ merchantCode: 'test' });
    expect(extractDuitkuSignature(params.toString())).toBeUndefined();
  });

  it('should parse Duitku payload', () => {
    const payload = buildPayload();
    const parsed = parseDuitkuPayload(payload);
    expect(parsed).toBeDefined();
    expect(parsed!.merchantCode).toBe(merchantCode);
    expect(parsed!.amount).toBe(100000);
    expect(parsed!.merchantOrderId).toBe(orderId);
    expect(parsed!.resultCode).toBe('00');
    expect(parsed!.reference).toBe('ref_001');
  });

  it('should return undefined for invalid payload', () => {
    expect(parseDuitkuPayload('')).toBeUndefined();
    expect(parseDuitkuPayload(null as unknown as string)).toBeUndefined();
  });
});
