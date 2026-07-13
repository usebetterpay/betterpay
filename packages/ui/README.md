# `@betterpay/ui`

React UI for BetterPay billing portals — pricing, subscriptions, entitlements, and invoices.

Built for **Indonesian payment products**: IDR-first formatting, BetterPay status vocabulary, Base UI primitives, and a calm fintech visual system.

## Install

```bash
pnpm add @betterpay/ui react react-dom
```

Import optional CSS variables if your app does not already define theme tokens:

```ts
import '@betterpay/ui/styles.css';
```

## Quick example

```tsx
import {
  PricingTable,
  BillingPortal,
  type PlanView,
  type SubscriptionView,
} from '@betterpay/ui';

const plans: PlanView[] = [
  {
    id: 'free',
    name: 'Free',
    monthlyAmount: 0,
    yearlyAmount: 0,
    currency: 'IDR',
    features: [{ id: 'msg', label: '100 messages / month' }],
    ctaLabel: 'Start free',
  },
  {
    id: 'pro',
    name: 'Pro',
    monthlyAmount: 199_000,
    yearlyAmount: 1_990_000,
    currency: 'IDR',
    recommended: true,
    badge: 'Popular',
    features: [
      { id: 'msg', label: '5.000 messages / month' },
      { id: 'wa', label: 'WhatsApp notifications' },
    ],
    ctaLabel: 'Upgrade to Pro',
  },
];

export function PricingPage() {
  return (
    <PricingTable
      plans={plans}
      onSelectPlan={(planId, interval) => {
        // call pay.billing.subscribe(...)
        console.log(planId, interval);
      }}
    />
  );
}

const subscription: SubscriptionView = {
  id: 'sub_1',
  planId: 'pro',
  planName: 'Pro',
  status: 'active',
  interval: 'month',
  nextAmount: 199_000,
  currency: 'IDR',
  currentPeriodEnd: '2026-08-01',
  paymentMethodLabel: 'BCA Virtual Account',
};

export function PortalPage() {
  return (
    <BillingPortal
      subscription={subscription}
      plans={plans}
      entitlements={[
        {
          featureId: 'messages',
          label: 'Messages',
          used: 1_240,
          limit: 5_000,
          resetLabel: 'monthly',
        },
      ]}
      invoices={[]}
      onChangePlan={(planId) => console.log('change', planId)}
      onCancel={({ reasonId }) => console.log('cancel', reasonId)}
    />
  );
}
```

## Components

| Component | Role |
|-----------|------|
| `PlanCard` / `PlanGroup` | Compound plan cards + interval context |
| `PricingTable` | Opinionated section on top of PlanGroup |
| `PlanComparison` | Feature × plan comparison matrix |
| `PlanSwitcher` | Dialog to change plan |
| `SubscriptionSummary` | Current plan + status + next charge |
| `CancelFlow` | Confirm cancel + optional reason |
| `EntitlementMeter` | Single usage meter |
| `UsageSummary` | Multi-meter panel with expand |
| `InvoiceTable` / `InvoiceCard` | Invoice history (table + mobile cards) |
| `PaymentStatusBanner` | Success / failed / past_due / pending |
| `BillingPortal` | Composed portal layout |
| `useControllableState` | Controlled/uncontrolled helper |

### Compound pricing

```tsx
import { PlanGroup, PlanCard } from '@betterpay/ui';

<PlanGroup defaultInterval="month" onIntervalChange={console.log}>
  {/* or pass plans={...} for auto grid */}
</PlanGroup>

<PlanCard plan={pro} interval="month" onSelect={...} />
```

## Design

See [`DESIGN.md`](./DESIGN.md) for tokens, density, and IDR rules.

## Peer dependencies

- `react` ^19
- `react-dom` ^19

Host apps should provide Tailwind (or equivalent) for utility classes used by components.
