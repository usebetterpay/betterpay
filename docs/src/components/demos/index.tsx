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

/** Full-width shell so mobile preview isn't capped by demo wrappers. */
function DemoShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={className ?? 'w-full min-w-0 max-w-full'}>{children}</div>;
}

export function DemoPlanCard() {
  return (
    <DemoShell className="w-full max-w-sm">
      <PlanCard
        plan={demoPlans[1]}
        interval="month"
        onSelect={(id, interval) => console.log('select', id, interval)}
      />
    </DemoShell>
  );
}

export function DemoPlanGroup() {
  return (
    <DemoShell>
      <PlanGroup
        plans={demoPlans}
        title="Choose a plan"
        description="IDR pricing for Indonesian payment products."
        defaultInterval="month"
        onSelectPlan={(id, interval) => console.log(id, interval)}
      />
    </DemoShell>
  );
}

export function DemoPricingTable() {
  return (
    <DemoShell>
      <PricingTable
        plans={demoPlans}
        title="Simple pricing"
        description="Switch monthly or yearly anytime."
        onSelectPlan={(id, interval) => console.log(id, interval)}
      />
    </DemoShell>
  );
}

export function DemoPlanComparison() {
  return (
    <DemoShell>
      <PlanComparison
        plans={demoPlans}
        interval="month"
        onSelectPlan={(id) => console.log(id)}
      />
    </DemoShell>
  );
}

export function DemoSubscriptionSummary() {
  return (
    <DemoShell className="w-full max-w-lg">
      <SubscriptionSummary
        subscription={demoSubscription}
        onUpgrade={() => console.log('upgrade')}
        onCancel={() => console.log('cancel')}
      />
    </DemoShell>
  );
}

export function DemoPlanSwitcher() {
  return (
    <DemoShell>
      <PlanSwitcher
        plans={demoPlans}
        currentPlanId="pro"
        interval="month"
        onConfirm={(id) => console.log('confirm', id)}
      />
    </DemoShell>
  );
}

export function DemoCancelFlow() {
  return (
    <DemoShell>
      <CancelFlow
        planName="Pro"
        onConfirm={({ reasonId }) => console.log('cancel', reasonId)}
      />
    </DemoShell>
  );
}

export function DemoEntitlementMeter() {
  return (
    <DemoShell className="w-full max-w-md">
      <EntitlementMeter entitlement={demoEntitlements[0]} />
    </DemoShell>
  );
}

export function DemoUsageSummary() {
  return (
    <DemoShell className="w-full max-w-lg">
      <UsageSummary
        entitlements={demoEntitlements}
        periodLabel="12 days left in cycle"
        collapseAfter={2}
      />
    </DemoShell>
  );
}

export function DemoInvoiceTable() {
  return (
    <DemoShell className="w-full max-w-3xl">
      <InvoiceTable
        invoices={demoInvoices}
        onDownload={(id) => console.log('download', id)}
      />
    </DemoShell>
  );
}

export function DemoInvoiceCard() {
  return (
    <DemoShell className="flex w-full max-w-lg flex-col gap-3">
      <InvoiceCard
        invoice={demoInvoices[0]}
        onDownload={(id) => console.log(id)}
      />
      <InvoiceCardList
        invoices={demoInvoices}
        onDownload={(id) => console.log(id)}
      />
    </DemoShell>
  );
}

export function DemoPaymentStatusBanner() {
  return (
    <DemoShell className="flex w-full max-w-lg flex-col gap-3">
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
    </DemoShell>
  );
}

export function DemoBillingPortal() {
  return (
    <DemoShell className="w-full max-w-3xl">
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
    </DemoShell>
  );
}
