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
 * Monthly / Yearly control — padded pill, never cramped labels.
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
        'inline-flex w-fit max-w-full shrink-0 items-center gap-3.5',
        'rounded-full bg-muted/60 px-5 py-2.5 text-sm ring-1 ring-border/60',
        className,
      )}
    >
      <button
        type="button"
        onClick={() => onChange('month')}
        aria-pressed={!yearly}
        className={cn(
          'whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition-colors',
          !yearly
            ? 'font-semibold text-foreground'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        Monthly
      </button>

      <Switch
        size="sm"
        checked={yearly}
        onCheckedChange={(checked) => onChange(checked ? 'year' : 'month')}
        aria-label={switchLabel}
        className="shrink-0"
      />

      <button
        type="button"
        onClick={() => onChange('year')}
        aria-pressed={yearly}
        className={cn(
          'whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition-colors',
          yearly
            ? 'font-semibold text-foreground'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        Yearly
      </button>
    </div>
  );
}
