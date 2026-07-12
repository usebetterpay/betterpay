import type {
  InvoiceStatus,
  PaymentCalloutStatus,
  SubscriptionStatus,
} from '../lib/status';

/** Presentational plan model for pricing and switchers. */
export interface PlanView {
  id: string;
  name: string;
  description?: string;
  /** Amount in major units for the given currency (IDR: whole rupiah). */
  monthlyAmount: number;
  yearlyAmount: number;
  currency?: string;
  /** Highlight as recommended / popular. */
  recommended?: boolean;
  badge?: string;
  features: Array<{
    id: string;
    label: string;
    included?: boolean;
  }>;
  ctaLabel?: string;
}

export type BillingInterval = 'month' | 'year';

export interface SubscriptionView {
  id: string;
  planId: string;
  planName: string;
  status: SubscriptionStatus;
  interval: BillingInterval | 'custom';
  /** Next charge amount in major units. */
  nextAmount?: number;
  currency?: string;
  currentPeriodEnd?: string | Date | null;
  paymentMethodLabel?: string;
  cancelAtPeriodEnd?: boolean;
}

export interface InvoiceView {
  id: string;
  number: string;
  /** Amount in major units. */
  amount: number;
  currency?: string;
  status: InvoiceStatus;
  issuedAt: string | Date;
  paidAt?: string | Date | null;
  downloadUrl?: string;
}

export interface EntitlementView {
  featureId: string;
  label: string;
  used: number;
  /** null = unlimited */
  limit: number | null;
  resetLabel?: string;
}

export interface PaymentCalloutView {
  status: PaymentCalloutStatus;
  title?: string;
  description?: string;
}
