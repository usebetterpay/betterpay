import { describe, expect, it } from 'vitest';
import { formatBillingIntervalLabel } from '../src/lib/labels';

describe('formatBillingIntervalLabel', () => {
  it('humanizes month and year', () => {
    expect(formatBillingIntervalLabel('month')).toBe('Monthly');
    expect(formatBillingIntervalLabel('year')).toBe('Yearly');
  });

  it('humanizes custom', () => {
    expect(formatBillingIntervalLabel('custom')).toBe('Custom');
  });

  it('passthrough unknown strings', () => {
    expect(formatBillingIntervalLabel('quarter')).toBe('quarter');
  });
});
