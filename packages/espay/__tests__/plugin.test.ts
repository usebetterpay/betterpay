import { describe, expect, it } from 'vitest';
import { generateKeyPairSync } from 'node:crypto';
import { espay } from '../src';

const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const privatePem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();

describe('espay plugin', () => {
  it('registers the Espay provider and error codes', () => {
    const plugin = espay({ partnerId: 'SGWYTEST', privateKey: privatePem });
    expect(plugin.id).toBe('espay');
    expect(plugin.defaultProvider).toBe('espay');
    expect(plugin.providers?.[0]?.id).toBe('espay');
    expect(plugin.$ERROR_CODES).toHaveProperty('ESPAY_CREATE_ERROR');
  });
});
