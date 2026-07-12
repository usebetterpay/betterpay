import { cn } from '../lib/cn';
import type { PaymentCalloutStatus } from '../lib/status';
import type {
  EntitlementView,
  InvoiceView,
  PlanView,
  SubscriptionView,
} from '../types/billing-ui';
import { CancelFlow } from './cancel-flow';
import { EntitlementMeter } from './entitlement-meter';
import { InvoiceTable } from './invoice-table';
import { PaymentStatusBanner } from './payment-status-banner';
import { PlanSwitcher } from './plan-switcher';
import { SubscriptionSummary } from './subscription-summary';

export interface BillingPortalProps {
  subscription: SubscriptionView;
  plans?: PlanView[];
  entitlements?: EntitlementView[];
  invoices?: InvoiceView[];
  callout?: {
    status: PaymentCalloutStatus;
    title?: string;
    description?: string;
  } | null;
  onChangePlan?: (planId: string) => void;
  onCancel?: (payload: { reasonId?: string }) => void;
  onDownloadInvoice?: (invoiceId: string) => void;
  onDismissCallout?: () => void;
  className?: string;
  title?: string;
}

/**
 * Presentational billing portal layout.
 * Wire data from `@betterpay/billing` in the host app.
 */
export function BillingPortal({
  subscription,
  plans = [],
  entitlements = [],
  invoices = [],
  callout = null,
  onChangePlan,
  onCancel,
  onDownloadInvoice,
  onDismissCallout,
  className,
  title = 'Billing',
}: BillingPortalProps) {
  return (
    <div data-slot="billing-portal" className={cn('mx-auto flex w-full max-w-4xl flex-col gap-6', className)}>
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-[var(--bp-muted-foreground,#64748b)]">
          Manage plan, usage, and invoices.
        </p>
      </header>

      {callout ? (
        <PaymentStatusBanner
          status={callout.status}
          title={callout.title}
          description={callout.description}
          dismissible={Boolean(onDismissCallout)}
          onDismiss={onDismissCallout}
        />
      ) : null}

      <SubscriptionSummary subscription={subscription} />

      {plans.length > 0 || onCancel ? (
        <div className="flex flex-wrap items-center gap-2" data-slot="billing-portal-actions">
          {plans.length > 0 ? (
            <PlanSwitcher
              plans={plans}
              currentPlanId={subscription.planId}
              interval={subscription.interval === 'custom' ? 'month' : subscription.interval}
              onConfirm={onChangePlan}
            />
          ) : null}
          {onCancel ? (
            <CancelFlow planName={subscription.planName} onConfirm={onCancel} />
          ) : null}
        </div>
      ) : null}

      {entitlements.length > 0 ? (
        <section className="flex flex-col gap-3" data-slot="billing-portal-usage">
          <h2 className="text-sm font-semibold tracking-tight">Usage</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {entitlements.map((item) => (
              <EntitlementMeter key={item.featureId} entitlement={item} />
            ))}
          </div>
        </section>
      ) : null}

      <InvoiceTable invoices={invoices} onDownload={onDownloadInvoice} />
    </div>
  );
}
