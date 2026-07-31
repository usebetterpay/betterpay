import { describe, expect, it } from 'vitest';
import { generateKeyPairSync } from 'node:crypto';
import { winpay } from '../src';

const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const privatePem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();

describe('winpay plugin', () => {
  it('registers the Winpay provider and error codes', () => {
    const plugin = winpay({ partnerId: '170041', privateKey: privatePem });
    expect(plugin.id).toBe('winpay');
    expect(plugin.defaultProvider).toBe('winpay');
    expect(plugin.providers?.[0]?.id).toBe('winpay');
    expect(plugin.$ERROR_CODES).toHaveProperty('WINPAY_CREATE_ERROR');
    expect(plugin.$ERROR_CODES).toHaveProperty('WINPAY_STATUS_ERROR');
  });
});
