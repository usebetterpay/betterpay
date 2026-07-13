export interface FormatMoneyOptions {
  /** ISO 4217 currency code. Default: IDR */
  currency?: string;
  /** BCP 47 locale. Default: id-ID */
  locale?: string;
  /**
   * Amount unit:
   * - `major` — whole currency units (150000 = Rp 150.000) — default for IDR UX
   * - `minor` — ISO minor units (150000 = Rp 1.500 for IDR with 0 decimals would be wrong;
   *   use minor only when you store cents/yen-style units consistently)
   */
  unit?: 'major' | 'minor';
  /** Override fraction digits (IDR defaults to 0). */
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

const ZERO_DECIMAL = new Set(['IDR', 'VND', 'JPY', 'KRW']);

function defaultFractionDigits(currency: string): number {
  return ZERO_DECIMAL.has(currency.toUpperCase()) ? 0 : 2;
}

/**
 * Format a monetary amount for display.
 * Defaults to Indonesian Rupiah (`id-ID` / `IDR`) with no fraction digits.
 */
export function formatMoney(amount: number, options: FormatMoneyOptions = {}): string {
  if (!Number.isFinite(amount)) {
    throw new TypeError('formatMoney: amount must be a finite number');
  }

  const currency = (options.currency ?? 'IDR').toUpperCase();
  const locale = options.locale ?? 'id-ID';
  const unit = options.unit ?? 'major';
  const defaults = defaultFractionDigits(currency);
  const min = options.minimumFractionDigits ?? defaults;
  const max = options.maximumFractionDigits ?? defaults;

  let value = amount;
  if (unit === 'minor') {
    const divisor = 10 ** defaults;
    value = amount / (divisor === 0 ? 1 : divisor);
  }

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: min,
    maximumFractionDigits: max,
  }).format(value);
}

/** Convenience: IDR major units. */
export function formatIdr(amount: number): string {
  return formatMoney(amount, { currency: 'IDR', locale: 'id-ID', unit: 'major' });
}
