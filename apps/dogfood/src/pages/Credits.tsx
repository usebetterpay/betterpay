import {
  Button,
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  EntitlementMeter,
  formatIdr,
} from '@betterpay/ui';
import { CalloutBanner } from '../components/CalloutBanner';
import { PageHeader } from '../components/PageHeader';
import { ShaderAccent } from '../components/ShaderAccent';
import { api } from '../lib/api';
import { useDogfood } from '../lib/state';

export function CreditsPage() {
  const { state, setState, run } = useDogfood();
  if (!state) return null;

  return (
    <div className="stack">
      <PageHeader title="Credits">
        Payment use case: <strong>buy credit pack</strong> — one-shot top-up that adds bonus tokens
        without changing your plan.
      </PageHeader>

      <CalloutBanner />

      <EntitlementMeter entitlement={state.views.entitlement} className="bp-shader-card" />

      <div>
        <h2 className="section-label">Credit packs</h2>
        <div className="pack-grid">
          {state.catalog.packs.map((pack, index) => (
            <Card
              key={pack.id}
              elevated={Boolean(pack.badge)}
              className="h-full relative overflow-hidden"
            >
              {index === 1 ? <ShaderAccent variant="card" /> : null}
              <CardHeader>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '0.5rem',
                    minHeight: '1.5rem',
                    alignItems: 'flex-start',
                  }}
                >
                  <CardTitle className="text-base">{pack.name}</CardTitle>
                  {pack.badge ? <Badge tone="default">{pack.badge}</Badge> : null}
                </div>
                <CardDescription className="min-h-[2.75rem]">{pack.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col">
                <div className="pack-price">{formatIdr(pack.amountIdr)}</div>
                <p className="muted" style={{ marginTop: '0.35rem' }}>
                  +{pack.credits.toLocaleString('id-ID')} AI credits · one-time
                </p>
              </CardContent>
              <CardFooter className="mt-auto">
                <Button
                  className="w-full"
                  variant={pack.badge ? 'default' : 'outline'}
                  onClick={() =>
                    void run(async () => {
                      const res = await api.buyPack(pack.id);
                      setState(res.snapshot);
                      if (
                        res.payment?.paymentUrl &&
                        !res.payment.paymentUrl.includes('simulate.local')
                      ) {
                        window.open(res.payment.paymentUrl, '_blank');
                      }
                    })
                  }
                >
                  Pay with sandbox
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
