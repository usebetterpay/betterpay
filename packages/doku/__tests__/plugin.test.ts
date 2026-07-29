import { describe, expect, it } from 'vitest';
import { doku } from '../src';

describe('doku plugin', () => {
  it('registers the DOKU provider and error codes', () => {
    const plugin = doku({ clientId: 'MCH-1', privateKey: 'key' });
    expect(plugin.id).toBe('doku');
    expect(plugin.defaultProvider).toBe('doku');
    expect(plugin.providers?.[0]?.id).toBe('doku');
    expect(plugin.$ERROR_CODES).toHaveProperty('DOKU_CREATE_ERROR');
  });
});
