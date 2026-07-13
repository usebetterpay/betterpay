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
 * Compact Monthly / Yearly control (content-sized, never full-bleed).
 * Labels stay put; only the switch thumb moves inside an overflow-hidden track.
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
        'inline-flex w-fit max-w-full shrink-0 items-center gap-2.5',
        'rounded-full bg-muted/70 px-3 py-1.5 text-sm ring-1 ring-border/80',
        className,
      )}
    >
      <button
        type="button"
        onClick={() => onChange('month')}
        aria-pressed={!yearly}
        className={cn(
          'whitespace-nowrap rounded-md px-1 py-0.5 text-sm transition-colors',
          !yearly
            ? 'font-medium text-foreground'
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
          'whitespace-nowrap rounded-md px-1 py-0.5 text-sm transition-colors',
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
