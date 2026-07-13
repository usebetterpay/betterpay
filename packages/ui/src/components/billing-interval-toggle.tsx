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
 * Monthly / Yearly control. Controlled Switch (coss/Base UI pattern).
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
      data-interval={value}
      className={cn(
        'inline-flex w-full min-w-0 items-center justify-between gap-2 rounded-lg bg-muted/60 px-2.5 py-2 text-sm ring-1 ring-border',
        'sm:w-auto sm:justify-start sm:gap-3 sm:px-3',
        className,
      )}
    >
      <button
        type="button"
        onClick={() => onChange('month')}
        aria-pressed={!yearly}
        className={cn(
          'min-h-9 shrink-0 rounded-md px-2 py-1 transition-colors',
          !yearly
            ? 'font-semibold text-foreground'
            : 'font-normal text-muted-foreground hover:text-foreground',
        )}
      >
        Monthly
      </button>

      <Switch
        checked={yearly}
        onCheckedChange={(checked) => {
          onChange(checked ? 'year' : 'month');
        }}
        aria-label={switchLabel}
      />

      <button
        type="button"
        onClick={() => onChange('year')}
        aria-pressed={yearly}
        className={cn(
          'min-h-9 shrink-0 rounded-md px-2 py-1 transition-colors',
          yearly
            ? 'font-semibold text-foreground'
            : 'font-normal text-muted-foreground hover:text-foreground',
        )}
      >
        Yearly
      </button>
    </div>
  );
}
