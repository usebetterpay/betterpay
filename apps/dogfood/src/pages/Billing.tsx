import { BillingPortal } from '@betterpay/ui';
import { api } from '../lib/api';
import { useDogfood } from '../lib/state';

export function BillingPage() {
  const { state, setState, run } = useDogfood();
  if (!state) return null;

  return (
    <div className="stack">
      <div>
        <h1 className="page-title">Billing portal</h1>
        <p className="page-desc">
          Full <code>BillingPortal</code> from <code>@betterpay/ui</code> — subscription, usage,
          invoices, plan switch, cancel.
        </p>
      </div>

      <BillingPortal
        title="Your billing"
        subscription={state.views.subscription}
        plans={state.views.plans}
        entitlements={state.views.entitlements}
        invoices={state.views.invoices}
        callout={state.views.callout}
        usagePeriodLabel="This period"
        onDismissCallout={() =>
          void run(async () => {
            setState(await api.dismissCallout());
          })
        }
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
