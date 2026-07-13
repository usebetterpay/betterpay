import type {
  EntitlementView,
  InvoiceView,
  PlanView,
  SubscriptionView,
} from '@betterpay/ui';

export const demoPlans: PlanView[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'Coba BetterPay di development.',
    monthlyAmount: 0,
    yearlyAmount: 0,
    currency: 'IDR',
    features: [
      { id: 'msg', label: '100 messages / month' },
      { id: 'wa', label: 'WhatsApp notifications', included: false },
      { id: 'sso', label: 'SSO', included: false },
    ],
    ctaLabel: 'Start free',
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'Untuk produk yang sudah live.',
    monthlyAmount: 199_000,
    yearlyAmount: 1_990_000,
    currency: 'IDR',
    recommended: true,
    badge: 'Popular',
    features: [
      { id: 'msg', label: '5.000 messages / month' },
      { id: 'wa', label: 'WhatsApp notifications' },
      { id: 'sso', label: 'SSO', included: false },
    ],
    ctaLabel: 'Upgrade to Pro',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Volume, SLA, dan support dedicated.',
    monthlyAmount: 999_000,
    yearlyAmount: 9_990_000,
    currency: 'IDR',
    features: [
      { id: 'msg', label: '50.000 messages / month' },
      { id: 'wa', label: 'WhatsApp notifications' },
      { id: 'sso', label: 'SSO' },
    ],
    ctaLabel: 'Talk to sales',
  },
];

export const demoSubscription: SubscriptionView = {
  id: 'sub_demo',
  planId: 'pro',
  planName: 'Pro',
  status: 'active',
  interval: 'month',
  nextAmount: 199_000,
  currency: 'IDR',
  currentPeriodEnd: '2026-08-12',
  paymentMethodLabel: 'BCA Virtual Account',
};

export const demoEntitlements: EntitlementView[] = [
  {
    featureId: 'messages',
    label: 'Messages',
    used: 1_240,
    limit: 5_000,
    resetLabel: 'monthly',
  },
  {
    featureId: 'api',
    label: 'API calls',
    used: 41_200,
    limit: 50_000,
    resetLabel: 'monthly',
  },
  {
    featureId: 'seats',
    label: 'Seats',
    used: 3,
    limit: 10,
  },
];

export const demoInvoices: InvoiceView[] = [
  {
    id: 'inv_1',
    number: 'INV-2026-001',
    amount: 199_000,
    currency: 'IDR',
    status: 'paid',
    issuedAt: '2026-06-12',
  },
  {
    id: 'inv_2',
    number: 'INV-2026-002',
    amount: 199_000,
    currency: 'IDR',
    status: 'open',
    issuedAt: '2026-07-12',
  },
  {
    id: 'inv_3',
    number: 'INV-2026-003',
    amount: 199_000,
    currency: 'IDR',
    status: 'overdue',
    issuedAt: '2026-05-12',
  },
];
