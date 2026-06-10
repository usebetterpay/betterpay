import { describe, it, expect } from 'vitest';
import type { BetterPayPlugin } from '../src/plugin';

describe('BetterPayPlugin', () => {
  it('should accept minimal plugin with id only', () => {
    const plugin: BetterPayPlugin = {
      id: 'test-plugin',
    };
    expect(plugin.id).toBe('test-plugin');
  });

  it('should accept plugin with all optional fields', () => {
    const plugin: BetterPayPlugin = {
      id: 'full-plugin',
      version: '1.0.0',
      endpoints: {},
      hooks: {
        before: [],
        after: [],
      },
      $ERROR_CODES: {
        TEST_ERROR: { code: 'TEST_ERROR', message: 'Test error' },
      },
    };
    expect(plugin.id).toBe('full-plugin');
    expect(plugin.version).toBe('1.0.0');
  });
});
