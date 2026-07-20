import { NavLink, Outlet } from 'react-router-dom';
import { Badge } from '@betterpay/ui';
import { useDogfood } from '../lib/state';
import { HelpersPanel } from './HelpersPanel';

const NAV = [
  { to: '/', label: 'Overview', end: true },
  { to: '/plans', label: 'Plans' },
  { to: '/credits', label: 'Credits' },
  { to: '/billing', label: 'Billing' },
  { to: '/payments', label: 'Payments' },
];

export function Shell() {
  const { state, loading, error } = useDogfood();

  return (
    <>
      <nav className="topbar-mobile" aria-label="Mobile">
        {NAV.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end}>
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="dogfood-shell">
        <aside className="dogfood-sidebar">
          <div className="dogfood-brand">
            <h1>Acme AI</h1>
            <p>BetterPay dogfood · credits</p>
          </div>
          <nav className="dogfood-nav" aria-label="Primary">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => (isActive ? 'active' : undefined)}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          {state && (
            <div style={{ marginTop: 'auto', padding: '0.5rem', fontSize: '0.75rem' }}>
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                <Badge>{state.plan.name}</Badge>
                <Badge variant="secondary">{state.paymentMode}</Badge>
              </div>
              <div className="muted">{state.customerEmail}</div>
              <div className="muted">
                {state.credits.totalRemaining.toLocaleString('id-ID')} credits left
              </div>
            </div>
          )}
        </aside>

        <main className="dogfood-main">
          {loading && !state ? (
            <p className="muted">Loading dogfood state…</p>
          ) : error && !state ? (
            <div>
              <p className="page-title">API offline</p>
              <p className="page-desc">
                Start the API on port 8787 (`pnpm dev` in apps/dogfood). {error}
              </p>
            </div>
          ) : (
            <>
              {error && (
                <p className="muted" style={{ color: 'var(--destructive)', marginBottom: '0.75rem' }}>
                  {error}
                </p>
              )}
              <Outlet />
            </>
          )}
        </main>

        <HelpersPanel />
      </div>
    </>
  );
}
