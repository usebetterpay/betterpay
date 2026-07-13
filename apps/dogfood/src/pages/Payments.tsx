import { Badge, Button, PaymentStatusBanner, formatIdr } from '@betterpay/ui';
import { api } from '../lib/api';
import { useDogfood } from '../lib/state';

export function PaymentsPage() {
  const { state, setState, run } = useDogfood();
  if (!state) return null;

  const tone = (s: string) => {
    if (s === 'paid') return 'success' as const;
    if (s === 'pending') return 'warning' as const;
    if (s === 'failed') return 'danger' as const;
    return 'secondary' as const;
  };

  return (
    <div className="stack">
      <div>
        <h1 className="page-title">Payments</h1>
        <p className="page-desc">
          Two kinds: <strong>plan</strong> (subscribe/upgrade) and <strong>credit_pack</strong>{' '}
          (top-up). Checkout: real SumoPod / Midtrans sandbox links.
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

      {state.payments.length === 0 ? (
        <p className="muted">No payments yet. Buy a plan or credit pack.</p>
      ) : (
        state.payments.map((p) => (
          <div key={p.id} className="pay-row">
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <Badge variant={tone(p.status)}>{p.status}</Badge>
                <Badge variant="outline">{p.kind === 'plan' ? 'Buy plan' : 'Buy credits'}</Badge>
                <span style={{ fontWeight: 500 }}>{p.label}</span>
              </div>
              <p className="muted" style={{ margin: '0.35rem 0 0' }}>
                {formatIdr(p.amountIdr)} · +{p.creditsGranted.toLocaleString('id-ID')} credits ·{' '}
                {new Date(p.createdAt).toLocaleString('id-ID')}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {p.status === 'pending' && (
                <>
                  {p.paymentUrl && !p.paymentUrl.includes('simulate.local') && (
                    <Button size="sm" onClick={() => window.open(p.paymentUrl, '_blank')}>
                      Open checkout
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      void run(async () => {
                        setState(await api.simulatePayment(p.id, 'paid'));
                      })
                    }
                  >
                    Mark paid
                  </Button>
                </>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
