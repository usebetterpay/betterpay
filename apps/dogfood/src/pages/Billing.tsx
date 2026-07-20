import { BillingPortal } from '@betterpay/ui';
import { CalloutBanner } from '../components/CalloutBanner';
import { PageHeader } from '../components/PageHeader';
import { api } from '../lib/api';
import { useDogfood } from '../lib/state';

export function BillingPage() {
  const { state, setState, run } = useDogfood();
  if (!state) return null;

  return (
    <div className="stack">
      <PageHeader title="Billing portal">
        Full <code>BillingPortal</code> from <code>@betterpay/ui</code> — subscription, usage,
        invoices, plan switch, cancel.
      </PageHeader>

      <CalloutBanner />

      <BillingPortal
        title="Your billing"
        subscription={state.views.subscription}
        plans={state.views.plans}
        entitlements={state.views.entitlements}
        invoices={state.views.invoices}
        callout={null}
        usagePeriodLabel="This period"
        onChangePlan={(planId) => {
          void run(async () => {
            const res = await api.buyPlan(planId, state.interval);
            setState(res.snapshot);
          });
        }}
        onCancel={() => {
          void run(async () => {
            setState(await api.cancel(true));
          });
        }}
      />
    </div>
  );
}
