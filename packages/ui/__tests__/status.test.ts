import { describe, expect, it } from 'vitest';
import {
  invoiceStatusPresentation,
  isTerminalSubscription,
  paymentCalloutPresentation,
  subscriptionStatusPresentation,
} from '../src/lib/status';

describe('status presentations', () => {
  it('maps subscription statuses', () => {
    expect(subscriptionStatusPresentation('active')).toEqual({
      label: 'Active',
      tone: 'success',
    });
    expect(subscriptionStatusPresentation('past_due').tone).toBe('warning');
  });

  it('maps invoice statuses', () => {
    expect(invoiceStatusPresentation('paid').tone).toBe('success');
    expect(invoiceStatusPresentation('overdue').tone).toBe('danger');
  });

  it('maps payment callouts', () => {
    expect(paymentCalloutPresentation('failed').tone).toBe('danger');
  });

  it('detects terminal subscriptions', () => {
    expect(isTerminalSubscription('canceled')).toBe(true);
    expect(isTerminalSubscription('ended')).toBe(true);
    expect(isTerminalSubscription('active')).toBe(false);
  });
});
