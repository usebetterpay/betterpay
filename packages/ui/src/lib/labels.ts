import type { BillingInterval } from '../types/billing-ui';

export type IntervalLabelInput = BillingInterval | 'custom' | string;

/** English product labels for billing intervals (host can override via props later). */
export function formatBillingIntervalLabel(interval: IntervalLabelInput): string {
  switch (interval) {
    case 'month':
      return 'Monthly';
    case 'year':
      return 'Yearly';
    case 'custom':
      return 'Custom';
    default:
      return String(interval);
  }
}
