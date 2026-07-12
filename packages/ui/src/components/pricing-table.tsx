'use client';

import * as React from 'react';
import { CheckIcon } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';
import { formatMoney } from '../lib/money';
import type { BillingInterval, PlanView } from '../types/billing-ui';
import { Badge } from '../primitives/badge';
import { Button } from '../primitives/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../primitives/card';
import { Switch } from '../primitives/switch';

const shellVariants = cva('mx-auto flex w-full max-w-5xl flex-col gap-8', {
  variants: {
    density: {
      comfortable: 'gap-8',
      compact: 'gap-6',
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

export function PricingTable({
  plans,
  title = 'Choose a plan',
  description = 'Transparent pricing for Indonesian payment infrastructure.',
  interval: controlledInterval,
  defaultInterval = 'month',
  onIntervalChange,
  onSelectPlan,
  currencyFallback = 'IDR',
  density,
  className,
}: PricingTableProps) {
  const [uncontrolled, setUncontrolled] = React.useState<BillingInterval>(defaultInterval);
  const interval = controlledInterval ?? uncontrolled;

  const setInterval = (next: BillingInterval) => {
    if (controlledInterval === undefined) setUncontrolled(next);
    onIntervalChange?.(next);
  };

  const yearly = interval === 'year';

  return (
    <section data-slot="pricing-table" className={cn(shellVariants({ density }), className)}>
      <header className="flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex max-w-xl flex-col gap-2">
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--bp-foreground,#111)]">
            {title}
          </h2>
          {description ? (
            <p className="text-sm text-[var(--bp-muted-foreground,#64748b)]">{description}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className={cn(!yearly && 'font-medium')}>Monthly</span>
          <Switch
            checked={yearly}
            onCheckedChange={(checked) => setInterval(checked ? 'year' : 'month')}
            aria-label="Bill yearly"
          />
          <span className={cn(yearly && 'font-medium')}>Yearly</span>
        </div>
      </header>

      <div
        className={cn(
          'grid gap-4',
          plans.length === 1 && 'md:grid-cols-1',
          plans.length === 2 && 'md:grid-cols-2',
          plans.length >= 3 && 'md:grid-cols-3',
        )}
      >
        {plans.map((plan) => {
          const currency = plan.currency ?? currencyFallback;
          const amount = yearly ? plan.yearlyAmount : plan.monthlyAmount;
          const priceLabel = formatMoney(amount, { currency });
          const period = yearly ? '/ year' : '/ month';

          return (
            <Card
              key={plan.id}
              data-slot="pricing-plan"
              className={cn(
                'relative h-full',
                plan.recommended &&
                  'border-[var(--bp-primary,#0f3d4c)] ring-1 ring-[var(--bp-primary,#0f3d4c)]',
              )}
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle>{plan.name}</CardTitle>
                  {plan.badge || plan.recommended ? (
                    <Badge tone={plan.recommended ? 'default' : 'muted'}>
                      {plan.badge ?? 'Recommended'}
                    </Badge>
                  ) : null}
                </div>
                {plan.description ? <CardDescription>{plan.description}</CardDescription> : null}
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-semibold tracking-tight tabular-nums">
                    {priceLabel}
                  </span>
                  <span className="text-sm text-[var(--bp-muted-foreground,#64748b)]">{period}</span>
                </div>
                <ul className="flex flex-col gap-2.5" data-slot="pricing-features">
                  {plan.features.map((feature) => (
                    <li key={feature.id} className="flex items-start gap-2 text-sm">
                      <CheckIcon
                        className={cn(
                          'mt-0.5 size-4 shrink-0',
                          feature.included === false
                            ? 'text-[var(--bp-muted-foreground,#94a3b8)] opacity-40'
                            : 'text-[var(--bp-success,#2f6f4e)]',
                        )}
                        aria-hidden
                      />
                      <span
                        className={cn(
                          feature.included === false &&
                            'text-[var(--bp-muted-foreground,#94a3b8)] line-through',
                        )}
                      >
                        {feature.label}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  variant={plan.recommended ? 'default' : 'outline'}
                  onClick={() => onSelectPlan?.(plan.id, interval)}
                >
                  {plan.ctaLabel ?? 'Select plan'}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
