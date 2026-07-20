import { Outlet } from 'react-router-dom';
import { AppShell } from '@/components/app-shell';
import { HelpersPanel } from '@/components/HelpersPanel';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useDogfood } from '@/lib/state';

export function Shell() {
  const { state, loading, error } = useDogfood();

  return (
    <TooltipProvider>
      <AppShell>
        <div className="dogfood-inset-layout">
          <div className="dogfood-inset-main min-w-0 flex-1">
            {loading && !state ? (
              <p className="text-sm text-muted-foreground">Loading dogfood state…</p>
            ) : error && !state ? (
              <div className="page-header">
                <p className="page-title">API offline</p>
                <p className="page-desc">
                  Start the API (`pnpm dev` in apps/dogfood). {error}
                </p>
              </div>
            ) : (
              <>
                {error ? (
                  <p
                    className="mb-3 text-sm text-muted-foreground"
                    style={{ color: 'var(--destructive)' }}
                  >
                    {error}
                  </p>
                ) : null}
                <Outlet />
              </>
            )}
          </div>
          <aside className="dogfood-helpers-rail" aria-label="Demo helpers">
            <HelpersPanel />
          </aside>
        </div>
      </AppShell>
    </TooltipProvider>
  );
}
