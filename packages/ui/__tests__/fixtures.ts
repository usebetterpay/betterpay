import type { InvoiceView, PlanView, SubscriptionView } from '../src/types/billing-ui';

export const testPlans: PlanView[] = [
  {
    id: 'free',
    name: 'Free',
    monthlyAmount: 0,
    yearlyAmount: 0,
    features: [
      { id: 'msg', label: 'Messages', included: true },
      { id: 'wa', label: 'WhatsApp', included: false },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    monthlyAmount: 199_000,
    yearlyAmount: 1_990_000,
    recommended: true,
    features: [
      { id: 'msg', label: 'Messages', included: true },
      { id: 'wa', label: 'WhatsApp', included: true },
      { id: 'sso', label: 'SSO', included: true },
    ],
  },
];

export const testSubscription: SubscriptionView = {
  id: 'sub_1',
  planId: 'pro',
  planName: 'Pro',
  status: 'active',
  interval: 'month',
  nextAmount: 199_000,
  currency: 'IDR',
  currentPeriodEnd: '2026-08-01',
  paymentMethodLabel: 'BCA VA',
};

export const testInvoices: InvoiceView[] = [
  {
    id: 'inv_1',
    number: 'INV-001',
    amount: 199_000,
    currency: 'IDR',
    status: 'paid',
    issuedAt: '2026-07-01',
  },
];
