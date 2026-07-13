'use client';

import { cn } from '../lib/cn';
import type { BillingInterval } from '../types/billing-ui';
import { Switch } from '../primitives/switch';

export interface BillingIntervalToggleProps {
  value: BillingInterval;
  onChange: (interval: BillingInterval) => void;
  className?: string;
  /** Accessible name for the switch. */
  switchLabel?: string;
}

/**
 * Monthly / Yearly control used by PlanGroup and PlanComparison.
 */
export function BillingIntervalToggle({
  value,
  onChange,
  className,
  switchLabel = 'Bill yearly',
}: BillingIntervalToggleProps) {
  const yearly = value === 'year';

  return (
    <div
      data-slot="billing-interval-toggle"
      className={cn(
        'flex w-full items-center justify-between gap-2.5 rounded-lg bg-muted/60 px-3 py-2 text-sm ring-1 ring-border sm:w-auto sm:justify-start',
        className,
      )}
    >
      <button
        type="button"
        onClick={() => onChange('month')}
        className={cn(
          'min-h-9 rounded-md px-2 py-1 transition-colors',
          !yearly
            ? 'font-medium text-foreground'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        Monthly
      </button>
      <Switch
        checked={yearly}
        onCheckedChange={(checked) => onChange(checked ? 'year' : 'month')}
        aria-label={switchLabel}
      />
      <button
        type="button"
        onClick={() => onChange('year')}
        className={cn(
          'min-h-9 rounded-md px-2 py-1 transition-colors',
          yearly
            ? 'font-medium text-foreground'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        Yearly
      </button>
    </div>
  );
}
