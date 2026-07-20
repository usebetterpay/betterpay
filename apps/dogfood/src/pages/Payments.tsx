import { Badge, Button, formatIdr } from '@betterpay/ui';
import { CalloutBanner } from '../components/CalloutBanner';
import { PageHeader } from '../components/PageHeader';
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
      <PageHeader title="Payments">
        Two kinds: <strong>plan</strong> (subscribe/upgrade) and <strong>credit_pack</strong>{' '}
        (top-up). Checkout: real SumoPod / Midtrans sandbox links.
      </PageHeader>

      <CalloutBanner />

      {state.payments.length === 0 ? (
        <p className="muted">No payments yet. Buy a plan or credit pack.</p>
      ) : (
        <div className="pay-list">
          {state.payments.map((p) => (
            <div key={p.id} className="pay-row">
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    display: 'flex',
                    gap: '0.45rem',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                  }}
                >
                  <Badge variant={tone(p.status)}>{p.status}</Badge>
                  <Badge variant="outline">{p.kind === 'plan' ? 'Buy plan' : 'Buy credits'}</Badge>
                  <span className="pay-row-title">{p.label}</span>
                </div>
                <p className="muted" style={{ margin: '0.4rem 0 0' }}>
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
          ))}
        </div>
      )}
    </div>
  );
}
