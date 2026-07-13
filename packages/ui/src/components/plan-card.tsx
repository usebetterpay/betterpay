'use client';

import * as React from 'react';
import { CheckIcon } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';
import { formatMoney } from '../lib/money';
import type { BillingInterval, PlanView } from '../types/billing-ui';
import { Badge } from '../primitives/badge';
import { Button } from '../primitives/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../primitives/card';

const planCardShell = cva('relative h-full', {
  variants: {
    emphasis: {
      default: '',
      recommended: 'ring-2 ring-primary/35',
    },
  },
  defaultVariants: { emphasis: 'default' },
});

export interface PlanCardProps
  extends Omit<React.ComponentProps<typeof Card>, 'onSelect'>,
    VariantProps<typeof planCardShell> {
  plan?: PlanView;
  interval?: BillingInterval;
  currencyFallback?: string;
  onSelect?: (planId: string, interval: BillingInterval) => void;
}

/**
 * Compound plan surface. Use parts freely, or pass `plan` for a ready layout.
 */
function PlanCard({
  className,
  emphasis,
  plan,
  interval = 'month',
  currencyFallback = 'IDR',
  onSelect,
  children,
  elevated,
  ...props
}: PlanCardProps) {
  const resolvedEmphasis = emphasis ?? (plan?.recommended ? 'recommended' : 'default');
  const isElevated = elevated ?? Boolean(plan?.recommended);

  if (plan && !children) {
    const currency = plan.currency ?? currencyFallback;
    const amount = interval === 'year' ? plan.yearlyAmount : plan.monthlyAmount;
    const period = interval === 'year' ? '/ year' : '/ month';

    return (
      <Card
        data-slot="plan-card"
        elevated={isElevated}
        className={cn(planCardShell({ emphasis: resolvedEmphasis }), className)}
        {...props}
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
          <PlanCardPrice amount={amount} currency={currency} period={period} />
          <PlanCardFeatures features={plan.features} />
        </CardContent>
        <CardFooter>
          <Button
            className="w-full"
            variant={plan.recommended ? 'default' : 'outline'}
            onClick={() => onSelect?.(plan.id, interval)}
          >
            {plan.ctaLabel ?? 'Select plan'}
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card
      data-slot="plan-card"
      elevated={isElevated}
      className={cn(planCardShell({ emphasis: resolvedEmphasis }), className)}
      {...props}
    >
      {children}
    </Card>
  );
}

function PlanCardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <CardHeader data-slot="plan-card-header" className={className} {...props} />;
}

function PlanCardTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return <CardTitle data-slot="plan-card-title" className={className} {...props} />;
}

function PlanCardDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return <CardDescription data-slot="plan-card-description" className={className} {...props} />;
}

export interface PlanCardPriceProps extends React.ComponentProps<'div'> {
  amount: number;
  currency?: string;
  period?: string;
}

function PlanCardPrice({
  amount,
  currency = 'IDR',
  period = '/ month',
  className,
  ...props
}: PlanCardPriceProps) {
  return (
    <div
      data-slot="plan-card-price"
      className={cn('flex items-baseline gap-1.5', className)}
      {...props}
    >
      <span className="text-[1.75rem] font-semibold tracking-tight tabular-nums sm:text-3xl">
        {formatMoney(amount, { currency })}
      </span>
      {period ? <span className="text-sm text-muted-foreground">{period}</span> : null}
    </div>
  );
}

export interface PlanCardFeaturesProps extends React.ComponentProps<'ul'> {
  features: PlanView['features'];
}

function PlanCardFeatures({ features, className, ...props }: PlanCardFeaturesProps) {
  return (
    <ul
      data-slot="plan-card-features"
      className={cn('flex flex-col gap-2', className)}
      {...props}
    >
      {features.map((feature) => (
        <li key={feature.id} className="flex items-start gap-2 text-sm leading-snug">
          <CheckIcon
            className={cn(
              'mt-0.5 size-4 shrink-0',
              feature.included === false ? 'text-muted-foreground/50' : 'text-success',
            )}
            aria-hidden
          />
          <span className={cn(feature.included === false && 'text-muted-foreground line-through')}>
            {feature.label}
          </span>
        </li>
      ))}
    </ul>
  );
}

function PlanCardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <CardFooter data-slot="plan-card-footer" className={className} {...props} />;
}

export {
  PlanCard,
  PlanCardHeader,
  PlanCardTitle,
  PlanCardDescription,
  PlanCardPrice,
  PlanCardFeatures,
  PlanCardFooter,
};
