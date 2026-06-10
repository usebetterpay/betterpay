import { describe, it, expect } from 'vitest';
import { verifyPakasirSignature, parsePakasirPayload } from '../src/signature';

describe('Pakasir Signature', () => {
  const projectSlug = 'my-app';

  it('should verify when project slug matches', () => {
    const payload = JSON.stringify({ project: 'my-app', order_id: 'o1', amount: 100 });
    expect(verifyPakasirSignature(payload, '', projectSlug)).toBe(true);
  });

  it('should reject when project slug mismatches', () => {
    const payload = JSON.stringify({ project: 'other-app', order_id: 'o1', amount: 100 });
    expect(verifyPakasirSignature(payload, '', projectSlug)).toBe(false);
  });

  it('should reject empty inputs', () => {
    expect(verifyPakasirSignature('', '', 'slug')).toBe(false);
    expect(verifyPakasirSignature('{}', '', '')).toBe(false);
  });

  it('should reject invalid JSON', () => {
    expect(verifyPakasirSignature('not-json', '', projectSlug)).toBe(false);
  });

  it('should parse payload', () => {
    const payload = JSON.stringify({
      amount: 50000,
      order_id: 'ord_123',
      project: 'my-app',
      status: 'completed',
    });
    const parsed = parsePakasirPayload(payload);
    expect(parsed).toBeDefined();
    expect(parsed!.amount).toBe(50000);
    expect(parsed!.orderId).toBe('ord_123');
    expect(parsed!.project).toBe('my-app');
    expect(parsed!.status).toBe('completed');
  });

  it('should return undefined for invalid payload', () => {
    expect(parsePakasirPayload('')).toBeUndefined();
    expect(parsePakasirPayload('not-json')).toBeUndefined();
  });
});
