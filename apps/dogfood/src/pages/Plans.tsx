import { PricingTable } from '@betterpay/ui';
import { CalloutBanner } from '../components/CalloutBanner';
import { PageHeader } from '../components/PageHeader';
import { api } from '../lib/api';
import { useDogfood } from '../lib/state';

export function PlansPage() {
  const { state, setState, run } = useDogfood();
  if (!state) return null;

  return (
    <div className="stack">
      <PageHeader title="Plans">
        Monthly or yearly AI credit allowance. Paid plans open sandbox checkout (SumoPod QRIS or
        Midtrans). Top-ups live on Credits.
      </PageHeader>

      <CalloutBanner />

      <PricingTable
        className="plans-table"
        plans={state.views.plans}
        title=""
        description=""
        defaultInterval="month"
        onSelectPlan={(planId, interval) => {
          void run(async () => {
            const res = await api.buyPlan(planId, interval);
            setState(res.snapshot);
            if (res.payment?.paymentUrl && !res.payment.paymentUrl.includes('simulate.local')) {
              window.open(res.payment.paymentUrl, '_blank');
            }
          });
        }}
      />
    </div>
  );
}
