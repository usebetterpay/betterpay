/** BetterPay subscription lifecycle statuses. */
export type SubscriptionStatus =
  | 'scheduled'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'ended';

/** BetterPay invoice statuses. */
export type InvoiceStatus = 'draft' | 'open' | 'paid' | 'overdue' | 'void';

/** Payment / banner callout kinds. */
export type PaymentCalloutStatus = 'success' | 'failed' | 'past_due' | 'pending';

export type BadgeTone = 'default' | 'success' | 'warning' | 'danger' | 'muted';

export interface StatusPresentation {
  label: string;
  tone: BadgeTone;
}

const SUBSCRIPTION_MAP: Record<SubscriptionStatus, StatusPresentation> = {
  scheduled: { label: 'Scheduled', tone: 'muted' },
  active: { label: 'Active', tone: 'success' },
  past_due: { label: 'Past due', tone: 'warning' },
  canceled: { label: 'Canceled', tone: 'muted' },
  ended: { label: 'Ended', tone: 'muted' },
};

const INVOICE_MAP: Record<InvoiceStatus, StatusPresentation> = {
  draft: { label: 'Draft', tone: 'muted' },
  open: { label: 'Open', tone: 'default' },
  paid: { label: 'Paid', tone: 'success' },
  overdue: { label: 'Overdue', tone: 'danger' },
  void: { label: 'Void', tone: 'muted' },
};

const CALLOUT_MAP: Record<PaymentCalloutStatus, StatusPresentation> = {
  success: { label: 'Payment successful', tone: 'success' },
  failed: { label: 'Payment failed', tone: 'danger' },
  past_due: { label: 'Payment past due', tone: 'warning' },
  pending: { label: 'Payment pending', tone: 'default' },
};

export function subscriptionStatusPresentation(status: SubscriptionStatus): StatusPresentation {
  return SUBSCRIPTION_MAP[status];
}

export function invoiceStatusPresentation(status: InvoiceStatus): StatusPresentation {
  return INVOICE_MAP[status];
}

export function paymentCalloutPresentation(status: PaymentCalloutStatus): StatusPresentation {
  return CALLOUT_MAP[status];
}

export function isTerminalSubscription(status: SubscriptionStatus): boolean {
  return status === 'canceled' || status === 'ended';
}
