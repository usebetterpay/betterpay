// ── ISO 4217 Currency Handling ─────────────────────────────────────────────
// All amounts stored as integers in minor units.
// IDR has 0 decimals — Rp 199,000 = 199000 (integer)
// USD has 2 decimals — $19.99 = 1999 (cents)
// VND has 0 decimals — 100,000 ₫ = 100000

/**
 * ISO 4217 decimal places for common currencies.
 * Used to convert display amounts to minor units (integers).
 *
 * @example
 * toMinorUnits(199000, 'IDR')  // → 199000 (no decimals)
 * toMinorUnits(19.99, 'USD')   // → 1999 (2 decimals)
 * fromMinorUnits(1999, 'USD')  // → 19.99
 */
export const ISO_4217_DECIMALS: Record<string, number> = {
  // 0 decimals
  IDR: 0,
  VND: 0,
  JPY: 0,
  KRW: 0,
  CLP: 0,

  // 2 decimals
  USD: 2,
  SGD: 2,
  MYR: 2,
  PHP: 2,
  THB: 2,
  AUD: 2,
  EUR: 2,
  GBP: 2,
  CAD: 2,
  NZD: 2,
  HKD: 2,
  TWD: 2,
  CNY: 2,
  INR: 2,

  // 3 decimals (rare)
  BHD: 3,
  KWD: 3,
  OMR: 3,
};

/**
 * Get decimal places for a currency code. Defaults to 2 if unknown.
 */
export function getCurrencyDecimals(currency: string): number {
  return ISO_4217_DECIMALS[currency.toUpperCase()] ?? 2;
}

/**
 * Convert a display amount to minor units (integer).
 *
 * @example
 * toMinorUnits(199000, 'IDR')  // → 199000
 * toMinorUnits(19.99, 'USD')   // → 1999
 * toMinorUnits(100.5, 'USD')   // → 10050
 */
export function toMinorUnits(amount: number, currency: string): number {
  const decimals = getCurrencyDecimals(currency);
  return Math.round(amount * Math.pow(10, decimals));
}

/**
 * Convert minor units (integer) to display amount.
 *
 * @example
 * fromMinorUnits(199000, 'IDR')  // → 199000
 * fromMinorUnits(1999, 'USD')    // → 19.99
 */
export function fromMinorUnits(amount: number, currency: string): number {
  const decimals = getCurrencyDecimals(currency);
  return amount / Math.pow(10, decimals);
}

/**
 * Format amount for display with currency symbol.
 *
 * @example
 * formatCurrency(199000, 'IDR')  // → "Rp 199,000"
 * formatCurrency(1999, 'USD')    // → "$19.99"
 */
export function formatCurrency(amount: number, currency: string, locale?: string): string {
  const displayAmount = fromMinorUnits(amount, currency);
  return new Intl.NumberFormat(locale ?? getLocaleForCurrency(currency), {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: getCurrencyDecimals(currency),
    maximumFractionDigits: getCurrencyDecimals(currency),
  }).format(displayAmount);
}

function getLocaleForCurrency(currency: string): string {
  const map: Record<string, string> = {
    IDR: 'id-ID',
    USD: 'en-US',
    SGD: 'en-SG',
    MYR: 'ms-MY',
    PHP: 'en-PH',
    THB: 'th-TH',
    VND: 'vi-VN',
    JPY: 'ja-JP',
  };
  return map[currency.toUpperCase()] ?? 'en-US';
}
