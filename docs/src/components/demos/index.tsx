'use client';

import * as React from 'react';
import {
  BillingPortal,
  CancelFlow,
  EntitlementMeter,
  InvoiceCard,
  InvoiceCardList,
  InvoiceTable,
  PaymentStatusBanner,
  PlanCard,
  PlanComparison,
  PlanGroup,
  PlanSwitcher,
  PricingTable,
  SubscriptionSummary,
  UsageSummary,
  Button,
} from '@betterpay/ui';
import {
  demoEntitlements,
  demoInvoices,
  demoPlans,
  demoSubscription,
} from './sample-data';

export function DemoPlanCard() {
  return (
    <PlanCard
      plan={demoPlans[1]}
      interval="month"
      onSelect={(id, interval) => console.log('select', id, interval)}
    />
  );
}

export function DemoPlanGroup() {
  return (
    <div className="w-full max-w-5xl">
      <PlanGroup
        plans={demoPlans}
        title="Choose a plan"
        description="IDR pricing for Indonesian payment products."
        defaultInterval="month"
        onSelectPlan={(id, interval) => console.log(id, interval)}
      />
    </div>
  );
}

export function DemoPricingTable() {
  return (
    <div className="w-full max-w-5xl">
      <PricingTable
        plans={demoPlans}
        title="Simple pricing"
        description="Switch monthly or yearly anytime."
        onSelectPlan={(id, interval) => console.log(id, interval)}
      />
    </div>
  );
}

export function DemoPlanComparison() {
  return (
    <div className="w-full max-w-4xl">
      <PlanComparison
        plans={demoPlans}
        interval="month"
        onSelectPlan={(id) => console.log(id)}
      />
    </div>
  );
}

export function DemoSubscriptionSummary() {
  return (
    <div className="w-full max-w-lg">
      <SubscriptionSummary
        subscription={demoSubscription}
        onUpgrade={() => console.log('upgrade')}
        onCancel={() => console.log('cancel')}
      />
    </div>
  );
}

export function DemoPlanSwitcher() {
  return (
    <PlanSwitcher
      plans={demoPlans}
      currentPlanId="pro"
      interval="month"
      onConfirm={(id) => console.log('confirm', id)}
    />
  );
}

export function DemoCancelFlow() {
  return (
    <CancelFlow
      planName="Pro"
      onConfirm={({ reasonId }) => console.log('cancel', reasonId)}
    />
  );
}

export function DemoEntitlementMeter() {
  return (
    <div className="w-full max-w-md">
      <EntitlementMeter entitlement={demoEntitlements[0]} />
    </div>
  );
}

export function DemoUsageSummary() {
  return (
    <div className="w-full max-w-lg">
      <UsageSummary
        entitlements={demoEntitlements}
        periodLabel="12 days left in cycle"
        collapseAfter={2}
      />
    </div>
  );
}

export function DemoInvoiceTable() {
  return (
    <div className="w-full max-w-3xl">
      <InvoiceTable
        invoices={demoInvoices}
        onDownload={(id) => console.log('download', id)}
      />
    </div>
  );
}

export function DemoInvoiceCard() {
  return (
    <div className="flex w-full max-w-lg flex-col gap-3">
      <InvoiceCard
        invoice={demoInvoices[0]}
        onDownload={(id) => console.log(id)}
      />
      <InvoiceCardList
        invoices={demoInvoices}
        onDownload={(id) => console.log(id)}
      />
    </div>
  );
}

export function DemoPaymentStatusBanner() {
  return (
    <div className="flex w-full max-w-lg flex-col gap-3">
      <PaymentStatusBanner
        status="success"
        description="Invoice INV-2026-001 paid via BCA VA."
      />
      <PaymentStatusBanner
        status="past_due"
        description="Update payment to keep Pro features."
        action={
          <Button size="sm" variant="outline">
            Retry payment
          </Button>
        }
      />
      <PaymentStatusBanner
        status="failed"
        description="Virtual account expired."
        dismissible
        onDismiss={() => console.log('dismiss')}
      />
    </div>
  );
}

export function DemoBillingPortal() {
  return (
    <div className="w-full max-w-3xl">
      <BillingPortal
        subscription={demoSubscription}
        plans={demoPlans}
        entitlements={demoEntitlements}
        invoices={demoInvoices}
        usagePeriodLabel="12 days left in cycle"
        callout={{
          status: 'pending',
          description: 'Waiting for bank confirmation on the latest invoice.',
        }}
        onChangePlan={(id) => console.log('change', id)}
        onCancel={({ reasonId }) => console.log('cancel', reasonId)}
        onDownloadInvoice={(id) => console.log('dl', id)}
      />
    </div>
  );
}
