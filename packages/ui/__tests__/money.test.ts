import { describe, expect, it } from 'vitest';
import { formatIdr, formatMoney } from '../src/lib/money';

describe('formatMoney', () => {
  it('formats IDR major units without fraction digits', () => {
    const result = formatMoney(150_000, { currency: 'IDR', locale: 'id-ID' });
    expect(result).toMatch(/150/);
    expect(result).toMatch(/Rp|IDR/i);
  });

  it('formatIdr is IDR convenience', () => {
    const a = formatIdr(99_000);
    const b = formatMoney(99_000, { currency: 'IDR', locale: 'id-ID' });
    expect(a).toBe(b);
  });

  it('formats USD with two fraction digits by default', () => {
    const result = formatMoney(19.99, { currency: 'USD', locale: 'en-US' });
    expect(result).toContain('19.99');
  });

  it('converts minor units when unit=minor', () => {
    const result = formatMoney(1999, {
      currency: 'USD',
      locale: 'en-US',
      unit: 'minor',
    });
    expect(result).toContain('19.99');
  });

  it('throws on non-finite amount', () => {
    expect(() => formatMoney(Number.NaN)).toThrow(/finite/);
  });
});
