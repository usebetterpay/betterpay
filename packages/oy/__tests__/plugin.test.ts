import { describe, expect, it } from 'vitest';
import { oy } from '../src';

describe('oy plugin', () => {
  it('registers the OY! provider and error codes', () => {
    const plugin = oy({ username: 'user1', apiKey: 'key123' });
    expect(plugin.id).toBe('oy');
    expect(plugin.defaultProvider).toBe('oy');
    expect(plugin.providers?.[0]?.id).toBe('oy');
    expect(plugin.$ERROR_CODES).toHaveProperty('OY_DISBURSE_ERROR');
  });
});
