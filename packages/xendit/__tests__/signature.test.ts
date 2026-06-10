import { describe, it, expect } from 'vitest';
import { verifyXenditSignature, extractXenditSignature } from '../src/signature';

describe('Xendit Signature', () => {
  const webhookToken = 'xendit-webhook-secret-token';

  it('should verify valid token', () => {
    expect(verifyXenditSignature('{}', webhookToken, webhookToken)).toBe(true);
  });

  it('should reject mismatched token', () => {
    expect(verifyXenditSignature('{}', 'wrong_token_padded', webhookToken)).toBe(false);
  });

  it('should reject empty inputs', () => {
    expect(verifyXenditSignature('{}', '', webhookToken)).toBe(false);
    expect(verifyXenditSignature('{}', 'token', '')).toBe(false);
  });

  it('should reject different length tokens', () => {
    expect(verifyXenditSignature('{}', 'short', 'longer_token_here')).toBe(false);
  });

  it('should extract token from x-callback-token header', () => {
    expect(extractXenditSignature({ 'x-callback-token': 'my_token' })).toBe('my_token');
  });

  it('should extract token from uppercase header', () => {
    expect(extractXenditSignature({ 'X-CALLBACK-TOKEN': 'my_token' })).toBe('my_token');
  });

  it('should handle array header values', () => {
    expect(extractXenditSignature({ 'x-callback-token': ['first', 'second'] })).toBe('first');
  });

  it('should return undefined when header missing', () => {
    expect(extractXenditSignature({})).toBeUndefined();
  });
});
