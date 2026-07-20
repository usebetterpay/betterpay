'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';
import type { BillingInterval, PlanView } from '../types/billing-ui';
import { PlanGroup } from './plan-group';

const shellVariants = cva('mx-auto w-full min-w-0 max-w-5xl px-0', {
  variants: {
    density: {
      comfortable: '',
      compact: '[&_[data-slot=plan-group]]:gap-6 [&_[data-slot=plan-group]_header]:gap-4',
    },
  },
  defaultVariants: { density: 'comfortable' },
});

export interface PricingTableProps extends VariantProps<typeof shellVariants> {
  plans: PlanView[];
  title?: string;
  description?: string;
  /** Controlled interval. */
  interval?: BillingInterval;
  defaultInterval?: BillingInterval;
  onIntervalChange?: (interval: BillingInterval) => void;
  onSelectPlan?: (planId: string, interval: BillingInterval) => void;
  currencyFallback?: string;
  className?: string;
}

/**
 * Opinionated pricing section built on PlanGroup + PlanCard.
 * Prefer PlanGroup/PlanCard directly when you need custom composition.
 */
export function PricingTable({
  plans,
  title,
  description,
  interval,
  defaultInterval = 'month',
  onIntervalChange,
  onSelectPlan,
  currencyFallback = 'IDR',
  density,
  className,
}: PricingTableProps) {
  // Empty string = intentionally hide (e.g. page already has a header).
  // undefined = component defaults for standalone / docs usage.
  const resolvedTitle = title === undefined ? 'Choose a plan' : title || undefined;
  const resolvedDescription =
    description === undefined
      ? 'Transparent pricing for Indonesian payment infrastructure.'
      : description || undefined;

  return (
    <section
      data-slot="pricing-table"
      className={cn(shellVariants({ density }), className)}
    >
      <PlanGroup
        plans={plans}
        title={resolvedTitle}
        description={resolvedDescription}
        interval={interval}
        defaultInterval={defaultInterval}
        onIntervalChange={onIntervalChange}
        onSelectPlan={onSelectPlan}
        currencyFallback={currencyFallback}
        showIntervalToggle
      />
    </section>
  );
}
