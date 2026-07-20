import { Button, Badge } from '@betterpay/ui';
import { api } from '../lib/api';
import { useDogfood } from '../lib/state';

const TEMPLATES = [
  { id: 'empty_free', label: 'Empty Free' },
  { id: 'active_starter', label: 'Active Starter' },
  { id: 'low_credits', label: 'Low credits' },
  { id: 'pro_heavy', label: 'Pro + pack' },
] as const;

export function HelpersPanel() {
  const { state, setState, run } = useDogfood();
  if (!state) return null;

  const pending = state.payments.filter((p) => p.status === 'pending');

  return (
    <aside className="dogfood-helpers" aria-label="Dogfood helpers">
      <div className="helper-section">
        <h2>Helpers</h2>
        <p className="muted" style={{ margin: 0 }}>
          Templates & simulators for AI credit use cases. Not shown in production apps.
        </p>
      </div>

      <div className="helper-section">
        <h2>Seed template</h2>
        <div className="helper-row">
          {TEMPLATES.map((t) => (
            <Button
              key={t.id}
              size="sm"
              variant="secondary"
              onClick={() =>
                void run(async () => {
                  setState(await api.seed(t.id));
                })
              }
            >
              {t.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="helper-section">
        <h2>Burn AI credits</h2>
        <p className="muted" style={{ margin: 0 }}>
          Balance: <strong>{state.credits.totalRemaining.toLocaleString('id-ID')}</strong>
        </p>
        <div className="helper-row">
          {[1, 10, 50, 100].map((n) => (
            <Button
              key={n}
              size="sm"
              variant="outline"
              onClick={() =>
                void run(async () => {
                  setState(await api.burn(n));
                })
              }
            >
              −{n}
            </Button>
          ))}
          <Button
            size="sm"
            variant="destructive-outline"
            onClick={() =>
              void run(async () => {
                setState(await api.burn(state.credits.totalRemaining));
              })
            }
          >
            Burn all
          </Button>
        </div>
        <div className="helper-row">
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              void run(async () => {
                setState(await api.grant(100));
              })
            }
          >
            +100 bonus
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              void run(async () => {
                setState(await api.resetPeriod());
              })
            }
          >
            Reset period
          </Button>
        </div>
      </div>

      <div className="helper-section">
        <h2>Payment mode</h2>
        <div className="helper-row">
          <Button
            size="sm"
            variant={state.paymentMode === 'simulate' ? 'default' : 'outline'}
            onClick={() =>
              void run(async () => {
                setState(await api.paymentMode('simulate'));
              })
            }
          >
            Simulate
          </Button>
          <Button
            size="sm"
            variant={state.paymentMode === 'live' ? 'default' : 'outline'}
            onClick={() =>
              void run(async () => {
                setState(await api.paymentMode('live'));
              })
            }
          >
            Live QRIS
          </Button>
        </div>
        <p className="muted" style={{ marginTop: '0.45rem' }}>
          Live mode is a stub URL until SumoPod keys are wired. Simulate marks payments paid
          instantly.
        </p>
      </div>

      <div className="helper-section">
        <h2>Pending payments</h2>
        {pending.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            None — buy a plan or credit pack first.
          </p>
        ) : (
          pending.map((p) => (
            <div key={p.id} style={{ marginTop: '0.55rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                <Badge variant="warning">{p.kind === 'plan' ? 'Plan' : 'Credit'}</Badge>
                <span style={{ fontSize: '0.8rem' }}>{p.label}</span>
              </div>
              <div className="helper-row">
                <Button
                  size="sm"
                  onClick={() =>
                    void run(async () => {
                      setState(await api.simulatePayment(p.id, 'paid'));
                    })
                  }
                >
                  Simulate paid
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    void run(async () => {
                      setState(await api.simulatePayment(p.id, 'failed'));
                    })
                  }
                >
                  Fail
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="helper-section">
        <h2>Activity</h2>
        <ul className="activity-list">
          {state.activity.map((a, i) => (
            <li key={`${a.at}-${i}`}>
              <div>{a.message}</div>
              <div>{new Date(a.at).toLocaleTimeString('id-ID')}</div>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
