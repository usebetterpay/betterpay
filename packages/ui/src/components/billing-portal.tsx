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
  /** Skeleton for invoice table/cards while host fetches history. */
  invoicesLoading?: boolean;
  /** Skeleton for usage section when entitlements are still loading. */
  usageLoading?: boolean;
}

/**
 * Presentational billing portal layout.
 * Wire data from `@betterpay/billing` in the host app.
 * Plan change / cancel live in the actions row (not on SubscriptionSummary).
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
  invoicesLoading = false,
  usageLoading = false,
}: BillingPortalProps) {
  return (
    <div
      data-slot="billing-portal"
      className={cn(
        '@container mx-auto flex w-full min-w-0 max-w-4xl flex-col gap-8 font-sans @md:gap-10',
        className,
      )}
    >
      <header className="flex min-w-0 flex-col gap-2">
        <h1 className="text-xl font-semibold tracking-tight @sm:text-[1.375rem]">
          {title}
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Plan, usage, and invoices for this account.
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
        <div
          className="flex flex-wrap items-center gap-3 sm:gap-4"
          data-slot="billing-portal-actions"
        >
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

      {usageLoading && entitlements.length === 0 ? (
        <div
          data-slot="billing-portal-usage-loading"
          className="rounded-xl border border-border p-6"
          aria-busy="true"
        >
          <div className="mb-4 h-4 w-28 animate-pulse rounded-md bg-muted" />
          <div className="h-2.5 w-full animate-pulse rounded-full bg-muted" />
        </div>
      ) : entitlements.length > 0 ? (
        <UsageSummary entitlements={entitlements} periodLabel={usagePeriodLabel} />
      ) : null}

      {invoiceLayout === 'cards' ? (
        <section className="flex flex-col gap-4" data-slot="billing-portal-invoices">
          <h2 className="text-base font-semibold tracking-tight">Invoices</h2>
          <InvoiceCardList
            invoices={invoices}
            onDownload={onDownloadInvoice}
            loading={invoicesLoading}
          />
        </section>
      ) : invoiceLayout === 'responsive' ? (
        <>
          <div className="hidden @md:block">
            <InvoiceTable
              invoices={invoices}
              onDownload={onDownloadInvoice}
              loading={invoicesLoading}
            />
          </div>
          <section
            className="flex flex-col gap-4 @md:hidden"
            data-slot="billing-portal-invoices-mobile"
          >
            <h2 className="text-base font-semibold tracking-tight">Invoices</h2>
            <InvoiceCardList
              invoices={invoices}
              onDownload={onDownloadInvoice}
              loading={invoicesLoading}
            />
          </section>
        </>
      ) : (
        <InvoiceTable
          invoices={invoices}
          onDownload={onDownloadInvoice}
          loading={invoicesLoading}
        />
      )}
    </div>
  );
}
