import {
  EntitlementMeter,
  PaymentStatusBanner,
  SubscriptionSummary,
  UsageSummary,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  formatIdr,
} from '@betterpay/ui';
import { useDogfood } from '../lib/state';
import { api } from '../lib/api';

export function OverviewPage() {
  const { state, setState, run } = useDogfood();
  if (!state) return null;
  const { views, credits } = state;

  return (
    <div className="stack">
      <div>
        <h1 className="page-title">Overview</h1>
        <p className="page-desc">
          Acme AI sells monthly credit plans and one-shot top-up packs. UI from{' '}
          <code>@betterpay/ui</code>.
        </p>
      </div>

      {views.callout && (
        <PaymentStatusBanner
          status={views.callout.status}
          title={views.callout.title}
          description={views.callout.description}
          dismissible
          onDismiss={() =>
            void run(async () => {
              setState(await api.dismissCallout());
            })
          }
        />
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(16rem, 1fr))',
          gap: '1rem',
        }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Credits left</CardTitle>
            <CardDescription>Plan + bonus packs</CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ fontSize: '1.75rem', fontWeight: 600, letterSpacing: '-0.03em' }}>
              {credits.totalRemaining.toLocaleString('id-ID')}
            </div>
            <p className="muted" style={{ marginTop: '0.35rem' }}>
              Plan {credits.planRemaining.toLocaleString('id-ID')} · bonus{' '}
              {credits.bonusCredits.toLocaleString('id-ID')}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Current plan</CardTitle>
            <CardDescription>{state.plan.name}</CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ fontSize: '1.75rem', fontWeight: 600, letterSpacing: '-0.03em' }}>
              {state.plan.monthlyAmount === 0
                ? 'Free'
                : formatIdr(state.plan.monthlyAmount)}
            </div>
            <p className="muted" style={{ marginTop: '0.35rem' }}>
              {state.plan.creditsPerPeriod.toLocaleString('id-ID')} credits / month
            </p>
          </CardContent>
        </Card>
      </div>

      <SubscriptionSummary subscription={views.subscription} />
      <EntitlementMeter entitlement={views.entitlement} />
      <UsageSummary entitlements={views.entitlements} periodLabel="This billing period" />
    </div>
  );
}
