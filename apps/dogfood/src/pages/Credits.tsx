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
  PaymentStatusBanner,
  formatIdr,
} from '@betterpay/ui';
import { api } from '../lib/api';
import { useDogfood } from '../lib/state';

export function CreditsPage() {
  const { state, setState, run } = useDogfood();
  if (!state) return null;

  return (
    <div className="stack">
      <div>
        <h1 className="page-title">Credits</h1>
        <p className="page-desc">
          Payment use case: <strong>buy credit pack</strong> — one-shot top-up that adds bonus
          tokens without changing your plan.
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

      <EntitlementMeter entitlement={state.views.entitlement} />

      <div>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: '0 0 0.65rem' }}>Credit packs</h2>
        <div className="pack-grid">
          {state.catalog.packs.map((pack) => (
            <Card key={pack.id}>
              <CardHeader>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <CardTitle className="text-base">{pack.name}</CardTitle>
                  {pack.badge && <Badge>{pack.badge}</Badge>}
                </div>
                <CardDescription>{pack.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div style={{ fontSize: '1.35rem', fontWeight: 600 }}>
                  {formatIdr(pack.amountIdr)}
                </div>
                <p className="muted" style={{ marginTop: '0.25rem' }}>
                  +{pack.credits.toLocaleString('id-ID')} AI credits · one-time
                </p>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
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
