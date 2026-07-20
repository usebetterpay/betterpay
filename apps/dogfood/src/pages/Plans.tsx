import { PricingTable, PaymentStatusBanner } from '@betterpay/ui';
import { api } from '../lib/api';
import { useDogfood } from '../lib/state';

export function PlansPage() {
  const { state, setState, run } = useDogfood();
  if (!state) return null;

  return (
    <div className="stack">
      <div>
        <h1 className="page-title">Plans</h1>
        <p className="page-desc">
          Payment use case: <strong>buy plan</strong> — monthly/yearly allowance of AI credits.
          Paid plans create a pending QRIS payment (simulate from Helpers).
        </p>
      </div>

      {state.views.callout && (
        <PaymentStatusBanner
          status={state.views.callout.status}
          title={state.views.callout.title}
          description={state.views.callout.description}
          dismissible
          onDismiss={() =>
            void run(async () => {
              setState(await api.dismissCallout());
            })
          }
        />
      )}

      <PricingTable
        plans={state.views.plans}
        title="AI credit plans"
        description="Subscribe for a monthly token allowance. Top-ups are on the Credits page."
        defaultInterval="month"
        onSelectPlan={(planId, interval) => {
          void run(async () => {
            const res = await api.buyPlan(planId, interval);
            setState(res.snapshot);
          });
        }}
      />
    </div>
  );
}
