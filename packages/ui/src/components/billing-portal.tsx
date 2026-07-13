import { cn } from '../lib/cn';
import type { PaymentCalloutStatus } from '../lib/status';
import type {
  EntitlementView,
  InvoiceView,
  PlanView,
  SubscriptionView,
} from '../types/billing-ui';
import { CancelFlow } from './cancel-flow';
import { InvoiceCardList } from './invoice-card';
import { InvoiceTable } from './invoice-table';
import { PaymentStatusBanner } from './payment-status-banner';
import { PlanSwitcher } from './plan-switcher';
import { SubscriptionSummary } from './subscription-summary';
import { UsageSummary } from './usage-summary';

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
  /** Prefer card stack on small viewports (default true). */
  invoiceLayout?: 'table' | 'cards' | 'responsive';
  usagePeriodLabel?: string;
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
  invoiceLayout = 'responsive',
  usagePeriodLabel,
}: BillingPortalProps) {
  return (
    <div
      data-slot="billing-portal"
      className={cn('mx-auto flex w-full max-w-4xl flex-col gap-7 font-sans', className)}
    >
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
        <p className="text-sm text-muted-foreground">Plan, usage, and invoices for this account.</p>
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
        <UsageSummary
          entitlements={entitlements}
          periodLabel={usagePeriodLabel}
        />
      ) : null}

      {invoiceLayout === 'cards' ? (
        <section className="flex flex-col gap-3" data-slot="billing-portal-invoices">
          <h2 className="text-sm font-semibold tracking-tight">Invoices</h2>
          <InvoiceCardList invoices={invoices} onDownload={onDownloadInvoice} />
        </section>
      ) : invoiceLayout === 'responsive' ? (
        <>
          <div className="hidden md:block">
            <InvoiceTable invoices={invoices} onDownload={onDownloadInvoice} />
          </div>
          <section className="flex flex-col gap-3 md:hidden" data-slot="billing-portal-invoices-mobile">
            <h2 className="text-sm font-semibold tracking-tight">Invoices</h2>
            <InvoiceCardList invoices={invoices} onDownload={onDownloadInvoice} />
          </section>
        </>
      ) : (
        <InvoiceTable invoices={invoices} onDownload={onDownloadInvoice} />
      )}
    </div>
  );
}
