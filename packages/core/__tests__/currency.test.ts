import { describe, it, expect } from 'vitest';
import {
  ISO_4217_DECIMALS,
  getCurrencyDecimals,
  toMinorUnits,
  fromMinorUnits,
  formatCurrency,
} from '../src/utils/currency';

describe('ISO 4217 Currency', () => {
  describe('ISO_4217_DECIMALS', () => {
    it('should have IDR as 0 decimals', () => {
      expect(ISO_4217_DECIMALS.IDR).toBe(0);
    });

    it('should have USD as 2 decimals', () => {
      expect(ISO_4217_DECIMALS.USD).toBe(2);
    });

    it('should have VND as 0 decimals', () => {
      expect(ISO_4217_DECIMALS.VND).toBe(0);
    });

    it('should have BHD as 3 decimals', () => {
      expect(ISO_4217_DECIMALS.BHD).toBe(3);
    });
  });

  describe('getCurrencyDecimals', () => {
    it('should return known decimals', () => {
      expect(getCurrencyDecimals('IDR')).toBe(0);
      expect(getCurrencyDecimals('USD')).toBe(2);
    });

    it('should default to 2 for unknown currencies', () => {
      expect(getCurrencyDecimals('XYZ')).toBe(2);
    });

    it('should be case insensitive', () => {
      expect(getCurrencyDecimals('idr')).toBe(0);
      expect(getCurrencyDecimals('usd')).toBe(2);
    });
  });

  describe('toMinorUnits', () => {
    it('should handle IDR (0 decimals)', () => {
      expect(toMinorUnits(199000, 'IDR')).toBe(199000);
    });

    it('should handle USD (2 decimals)', () => {
      expect(toMinorUnits(19.99, 'USD')).toBe(1999);
      expect(toMinorUnits(100.5, 'USD')).toBe(10050);
      expect(toMinorUnits(1, 'USD')).toBe(100);
    });

    it('should handle BHD (3 decimals)', () => {
      expect(toMinorUnits(1.5, 'BHD')).toBe(1500);
    });

    it('should handle zero', () => {
      expect(toMinorUnits(0, 'IDR')).toBe(0);
      expect(toMinorUnits(0, 'USD')).toBe(0);
    });
  });

  describe('fromMinorUnits', () => {
    it('should handle IDR (0 decimals)', () => {
      expect(fromMinorUnits(199000, 'IDR')).toBe(199000);
    });

    it('should handle USD (2 decimals)', () => {
      expect(fromMinorUnits(1999, 'USD')).toBe(19.99);
      expect(fromMinorUnits(10050, 'USD')).toBe(100.5);
    });

    it('should be inverse of toMinorUnits', () => {
      expect(fromMinorUnits(toMinorUnits(19.99, 'USD'), 'USD')).toBe(19.99);
      expect(fromMinorUnits(toMinorUnits(199000, 'IDR'), 'IDR')).toBe(199000);
    });
  });

  describe('formatCurrency', () => {
    it('should format IDR with Rp', () => {
      const result = formatCurrency(199000, 'IDR');
      expect(result).toContain('199');
    });

    it('should format USD with $', () => {
      const result = formatCurrency(1999, 'USD', 'en-US');
      expect(result).toContain('19.99');
    });

    it('should handle zero', () => {
      const result = formatCurrency(0, 'IDR');
      expect(result).toContain('0');
    });
  });
});
