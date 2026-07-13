'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';
import { useControllableState } from '../lib/use-controllable-state';
import type { BillingInterval, PlanView } from '../types/billing-ui';
import { Switch } from '../primitives/switch';
import { PlanCard } from './plan-card';

interface PlanGroupContextValue {
  interval: BillingInterval;
  setBillingInterval: (interval: BillingInterval) => void;
}

const PlanGroupContext = React.createContext<PlanGroupContextValue | null>(null);

export function usePlanGroup(): PlanGroupContextValue {
  const ctx = React.useContext(PlanGroupContext);
  if (!ctx) {
    throw new Error('usePlanGroup must be used within PlanGroup');
  }
  return ctx;
}

// Always single column on phones; multi-col only from md/xl up.
const planGroupGrid = cva('grid grid-cols-1 gap-3 md:gap-4', {
  variants: {
    columns: {
      1: 'md:grid-cols-1',
      2: 'md:grid-cols-2',
      3: 'sm:grid-cols-2 lg:grid-cols-3',
      4: 'sm:grid-cols-2 xl:grid-cols-4',
      auto: '',
    },
  },
  defaultVariants: { columns: 'auto' },
});

export interface PlanGroupProps
  extends Omit<React.ComponentProps<'div'>, 'defaultValue'>,
    VariantProps<typeof planGroupGrid> {
  interval?: BillingInterval;
  defaultInterval?: BillingInterval;
  onIntervalChange?: (interval: BillingInterval) => void;
  /** Convenience: render PlanCards from data. */
  plans?: PlanView[];
  onSelectPlan?: (planId: string, interval: BillingInterval) => void;
  currencyFallback?: string;
  showIntervalToggle?: boolean;
  title?: string;
  description?: string;
}

export function PlanGroup({
  className,
  columns = 'auto',
  interval: controlledInterval,
  defaultInterval = 'month',
  onIntervalChange,
  plans,
  onSelectPlan,
  currencyFallback = 'IDR',
  showIntervalToggle = true,
  title,
  description,
  children,
  ...props
}: PlanGroupProps) {
  // Avoid naming this `setInterval` — that shadows window.setInterval and
  // is easy to mis-wire; always use a domain-specific name.
  const [interval, setBillingInterval] = useControllableState(
    controlledInterval,
    defaultInterval,
    onIntervalChange,
  );

  const autoColumns =
    columns === 'auto' && plans
      ? plans.length >= 4
        ? 4
        : plans.length === 3
          ? 3
          : plans.length === 2
            ? 2
            : 1
      : columns;

  const ctx = React.useMemo(
    () => ({ interval, setBillingInterval }),
    [interval, setBillingInterval],
  );

  return (
    <PlanGroupContext.Provider value={ctx}>
      <div
        data-slot="plan-group"
        className={cn('flex w-full flex-col gap-6 font-sans', className)}
        {...props}
      >
        {(title || description || showIntervalToggle) && (
          <header className="flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex max-w-xl flex-col gap-1.5">
              {title ? (
                <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                  {title}
                </h2>
              ) : null}
              {description ? (
                <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
                  {description}
                </p>
              ) : null}
            </div>
            {showIntervalToggle ? <PlanGroupIntervalToggle /> : null}
          </header>
        )}

        {plans ? (
          <div
            className={cn(
              planGroupGrid({
                columns: autoColumns as VariantProps<typeof planGroupGrid>['columns'],
              }),
            )}
          >
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                interval={interval}
                currencyFallback={currencyFallback}
                onSelect={onSelectPlan}
              />
            ))}
          </div>
        ) : (
          children
        )}
      </div>
    </PlanGroupContext.Provider>
  );
}

export function PlanGroupIntervalToggle({ className }: { className?: string }) {
  const { interval, setBillingInterval } = usePlanGroup();
  const yearly = interval === 'year';

  const selectMonth = () => setBillingInterval('month');
  const selectYear = () => setBillingInterval('year');

  return (
    <div
      data-slot="plan-group-interval"
      className={cn(
        'flex w-full items-center justify-between gap-2.5 rounded-lg bg-muted/60 px-3 py-2 text-sm ring-1 ring-border sm:w-auto sm:justify-start',
        className,
      )}
    >
      <button
        type="button"
        onClick={selectMonth}
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
        onCheckedChange={(checked) => {
          setBillingInterval(checked ? 'year' : 'month');
        }}
        aria-label="Bill yearly"
      />
      <button
        type="button"
        onClick={selectYear}
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
