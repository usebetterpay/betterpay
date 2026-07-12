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

const shellVariants = cva('mx-auto flex w-full max-w-5xl flex-col font-sans', {
  variants: {
    density: {
      comfortable: 'gap-8',
      compact: 'gap-5',
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
      <header className="flex flex-col items-start gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex max-w-xl flex-col gap-1.5">
          <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            {title}
          </h2>
          {description ? (
            <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">{description}</p>
          ) : null}
        </div>
        <div
          className="flex items-center gap-2.5 rounded-lg bg-muted/60 px-3 py-2 text-sm ring-1 ring-border"
          data-slot="pricing-interval"
        >
          <span className={cn('text-muted-foreground', !yearly && 'font-medium text-foreground')}>
            Monthly
          </span>
          <Switch
            checked={yearly}
            onCheckedChange={(checked) => setInterval(checked ? 'year' : 'month')}
            aria-label="Bill yearly"
          />
          <span className={cn('text-muted-foreground', yearly && 'font-medium text-foreground')}>
            Yearly
          </span>
        </div>
      </header>

      <div
        className={cn(
          'grid gap-3 md:gap-4',
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
              elevated={Boolean(plan.recommended)}
              className={cn(
                'relative h-full',
                plan.recommended && 'ring-2 ring-primary/35',
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
              <CardContent className="flex flex-1 flex-col gap-5">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[1.75rem] font-semibold tracking-tight tabular-nums sm:text-3xl">
                    {priceLabel}
                  </span>
                  <span className="text-sm text-muted-foreground">{period}</span>
                </div>
                <ul className="flex flex-col gap-2" data-slot="pricing-features">
                  {plan.features.map((feature) => (
                    <li key={feature.id} className="flex items-start gap-2 text-sm leading-snug">
                      <CheckIcon
                        className={cn(
                          'mt-0.5 size-4 shrink-0',
                          feature.included === false
                            ? 'text-muted-foreground/50'
                            : 'text-success',
                        )}
                        aria-hidden
                      />
                      <span
                        className={cn(
                          feature.included === false && 'text-muted-foreground line-through',
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
