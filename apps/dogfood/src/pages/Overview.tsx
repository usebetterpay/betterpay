import {
  EntitlementMeter,
  SubscriptionSummary,
  UsageSummary,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  formatIdr,
} from '@betterpay/ui';
import { CalloutBanner } from '../components/CalloutBanner';
import { PageHeader } from '../components/PageHeader';
import { ShaderAccent } from '../components/ShaderAccent';
import { useDogfood } from '../lib/state';

export function OverviewPage() {
  const { state } = useDogfood();
  if (!state) return null;
  const { views, credits } = state;

  return (
    <div className="stack">
      <PageHeader title="Overview">
        Monthly credit plans and one-shot top-up packs. UI from <code>@betterpay/ui</code>.
      </PageHeader>

      <CalloutBanner />

      <div className="metric-grid">
        <Card className="relative overflow-hidden" elevated>
          <ShaderAccent variant="card" />
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Credits left
            </CardTitle>
            <CardDescription>Plan + bonus packs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="metric-value">{credits.totalRemaining.toLocaleString('id-ID')}</div>
            <p className="muted" style={{ marginTop: '0.45rem' }}>
              Plan {credits.planRemaining.toLocaleString('id-ID')} · bonus{' '}
              {credits.bonusCredits.toLocaleString('id-ID')}
            </p>
          </CardContent>
        </Card>
        <Card elevated>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Current plan
            </CardTitle>
            <CardDescription>{state.plan.name}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="metric-value">
              {state.plan.monthlyAmount === 0 ? 'Free' : formatIdr(state.plan.monthlyAmount)}
            </div>
            <p className="muted" style={{ marginTop: '0.45rem' }}>
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
