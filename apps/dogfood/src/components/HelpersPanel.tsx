import { Button, Badge, ScrollArea } from '@betterpay/ui';
import { api, type ProviderId, type Snapshot } from '../lib/api';
import { useDogfood } from '../lib/state';

const TEMPLATES = [
  { id: 'empty_free', label: 'Empty Free' },
  { id: 'active_starter', label: 'Active Starter' },
  { id: 'low_credits', label: 'Low credits' },
  { id: 'pro_heavy', label: 'Pro + pack' },
] as const;

const GATEWAYS: Array<{
  id: ProviderId;
  label: string;
  statusKey: keyof NonNullable<Snapshot['providers']>;
}> = [
  { id: 'sumopod', label: 'SumoPod QRIS', statusKey: 'sumopod' },
  { id: 'midtrans', label: 'Midtrans', statusKey: 'midtrans' },
  { id: 'xendit', label: 'Xendit', statusKey: 'xendit' },
  { id: 'tripay', label: 'Tripay', statusKey: 'tripay' },
];

function gatewayHint(ps: NonNullable<Snapshot['providers']>): string {
  const parts: string[] = [];
  if (ps.sumopod.configured) {
    parts.push(
      `SumoPod${ps.sumopod.sandbox ? ' sandbox' : ''}${ps.sumopod.webhookAuth ? ' · webhook auth' : ''}`,
    );
  }
  if (ps.midtrans.configured) {
    parts.push(`Midtrans${ps.midtrans.sandbox ? ' sandbox' : ' live'}`);
  }
  if (ps.xendit?.configured) {
    parts.push(`Xendit${ps.xendit.webhookAuth ? ' · webhook auth' : ''}`);
  }
  if (ps.tripay?.configured) {
    parts.push(`Tripay${ps.tripay.sandbox ? ' sandbox' : ' live'}`);
  }
  if (ps.duitku && !ps.duitku.configured) {
    parts.push('Duitku needs API keys');
  } else if (ps.duitku?.configured) {
    parts.push('Duitku ready (not wired yet)');
  }
  return parts.length ? parts.join(' · ') + '.' : 'No gateways configured in .env.';
}

export function HelpersPanel() {
  const { state, setState, run } = useDogfood();
  if (!state) return null;

  const pending = state.payments.filter((p) => p.status === 'pending');
  const ps = state.providers;

  return (
    <ScrollArea
      className="dogfood-helpers-scroll h-full min-h-0"
      viewportClassName="dogfood-helpers-viewport"
      orientation="vertical"
    >
      <div className="helper-section">
        <h2>Gateway</h2>
        <div className="helper-row">
          {GATEWAYS.map((g) => {
            const st = ps?.[g.statusKey] as { configured?: boolean } | undefined;
            const configured = st?.configured !== false;
            const selected = state.provider === g.id;
            return (
              <Button
                key={g.id}
                size="sm"
                variant={selected ? 'secondary' : 'outline'}
                disabled={Boolean(ps) && st?.configured === false}
                aria-pressed={selected}
                onClick={() =>
                  void run(async () => {
                    setState(await api.setProvider(g.id));
                  })
                }
              >
                {g.label}
                {!configured ? ' · off' : ''}
              </Button>
            );
          })}
        </div>
        <p className="muted" style={{ marginTop: '0.45rem' }}>
          {ps ? gatewayHint(ps) : 'Loading gateway status…'}
        </p>
        <div className="helper-row" style={{ marginTop: '0.35rem' }}>
          <Button
            size="sm"
            variant={state.paymentMode === 'live' ? 'secondary' : 'outline'}
            aria-pressed={state.paymentMode === 'live'}
            onClick={() =>
              void run(async () => {
                setState(await api.paymentMode('live'));
              })
            }
          >
            Live sandbox
          </Button>
          <Button
            size="sm"
            variant={state.paymentMode === 'simulate' ? 'secondary' : 'outline'}
            aria-pressed={state.paymentMode === 'simulate'}
            onClick={() =>
              void run(async () => {
                setState(await api.paymentMode('simulate'));
              })
            }
          >
            Simulate only
          </Button>
        </div>
      </div>

      <div className="helper-section">
        <h2>Seed template</h2>
        <div className="helper-row">
          {TEMPLATES.map((t) => (
            <Button
              key={t.id}
              size="sm"
              variant="outline"
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
            variant="outline"
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
        <h2>Pending payments</h2>
        {pending.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            None — buy a plan or credit pack first.
          </p>
        ) : (
          pending.map((p) => (
            <div key={p.id} style={{ marginTop: '0.55rem' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  flexWrap: 'wrap',
                }}
              >
                <Badge variant="warning">{p.kind === 'plan' ? 'Plan' : 'Credit'}</Badge>
                <Badge variant="outline">{p.provider ?? '—'}</Badge>
                <span style={{ fontSize: '0.8rem' }}>{p.label}</span>
              </div>
              <div className="helper-row">
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
                <Button
                  size="sm"
                  variant="ghost"
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
    </ScrollArea>
  );
}
