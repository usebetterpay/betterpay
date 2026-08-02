import { describe, expect, it } from 'vitest';
import { generateKeyPairSync } from 'node:crypto';
import { nicepay } from '../src';

const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const privatePem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();

describe('nicepay plugin', () => {
  it('registers the Nicepay provider and error codes', () => {
    const plugin = nicepay({ partnerId: 'IONPAYTEST', privateKey: privatePem });
    expect(plugin.id).toBe('nicepay');
    expect(plugin.defaultProvider).toBe('nicepay');
    expect(plugin.providers?.[0]?.id).toBe('nicepay');
    expect(plugin.$ERROR_CODES).toHaveProperty('NICEPAY_CREATE_ERROR');
  });
});
