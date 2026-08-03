import { describe, expect, it } from 'vitest';
import { faspay } from '../src';

describe('faspay plugin', () => {
  it('registers the Faspay provider and error codes', () => {
    const plugin = faspay({ merchantId: 'MCH-1', secretKey: 'secret' });
    expect(plugin.id).toBe('faspay');
    expect(plugin.defaultProvider).toBe('faspay');
    expect(plugin.providers?.[0]?.id).toBe('faspay');
    expect(plugin.$ERROR_CODES).toHaveProperty('FASPAY_CREATE_ERROR');
  });
});
