'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';
import { useControllableState } from '../lib/use-controllable-state';
import type { BillingInterval, PlanView } from '../types/billing-ui';
import { BillingIntervalToggle } from './billing-interval-toggle';
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

/**
 * Grid uses @container breakpoints so layout follows the component width
 * (docs mobile preview frames, sidebars), not only the browser viewport.
 */
const planGroupGrid = cva('grid w-full min-w-0 grid-cols-1 gap-5 @md:gap-6', {
  variants: {
    columns: {
      1: 'grid-cols-1',
      2: '@md:grid-cols-2',
      3: '@sm:grid-cols-2 @xl:grid-cols-3',
      4: '@sm:grid-cols-2 @lg:grid-cols-3 @2xl:grid-cols-4',
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
        className={cn(
          '@container w-full min-w-0 flex flex-col gap-8 font-sans @md:gap-10',
          className,
        )}
        {...props}
      >
        {(title || description || showIntervalToggle) && (
          <header className="flex w-full min-w-0 flex-col items-start gap-5 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
            <div className="flex min-w-0 max-w-xl flex-col gap-2.5">
              {title ? (
                <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-[1.375rem]">
                  {title}
                </h2>
              ) : null}
              {description ? (
                <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
                  {description}
                </p>
              ) : null}
            </div>
            {showIntervalToggle ? (
              <PlanGroupIntervalToggle className="shrink-0 self-start sm:self-end" />
            ) : null}
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
                className="min-w-0"
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

  return (
    <BillingIntervalToggle
      value={interval}
      onChange={setBillingInterval}
      className={className}
    />
  );
}
