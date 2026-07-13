'use client';

import type * as React from 'react';
import { CheckIcon, MinusIcon, XIcon } from 'lucide-react';
import { cn } from '../lib/cn';
import { useControllableState } from '../lib/use-controllable-state';
import { formatMoney } from '../lib/money';
import type { BillingInterval, PlanView } from '../types/billing-ui';
import { Badge } from '../primitives/badge';
import { Button } from '../primitives/button';
import { BillingIntervalToggle } from './billing-interval-toggle';

export type ComparisonCell = boolean | 'partial' | string;

export interface ComparisonFeatureRow {
  id: string;
  label: string;
  /** Values keyed by plan id. true/false/'partial'/custom label */
  values: Record<string, ComparisonCell>;
}

export interface PlanComparisonProps extends React.ComponentProps<'div'> {
  plans: PlanView[];
  /** Explicit matrix rows. If omitted, derived from union of plan.features. */
  features?: ComparisonFeatureRow[];
  /** Controlled interval. */
  interval?: BillingInterval;
  defaultInterval?: BillingInterval;
  onIntervalChange?: (interval: BillingInterval) => void;
  /** Show Monthly/Yearly toggle above the matrix. */
  showIntervalToggle?: boolean;
  currencyFallback?: string;
  onSelectPlan?: (planId: string) => void;
  ariaLabel?: string;
  emptyMessage?: string;
}

function deriveFeatures(plans: PlanView[]): ComparisonFeatureRow[] {
  const order: string[] = [];
  const labels = new Map<string, string>();

  for (const plan of plans) {
    for (const f of plan.features) {
      if (!labels.has(f.id)) {
        labels.set(f.id, f.label);
        order.push(f.id);
      }
    }
  }

  return order.map((id) => ({
    id,
    label: labels.get(id) ?? id,
    values: Object.fromEntries(
      plans.map((plan) => {
        const hit = plan.features.find((f) => f.id === id);
        if (!hit) return [plan.id, false] as const;
        return [plan.id, hit.included === false ? false : true] as const;
      }),
    ),
  }));
}

function CellValue({ value }: { value: ComparisonCell }) {
  if (value === true) {
    return <CheckIcon className="mx-auto size-4 text-success" aria-label="Included" />;
  }
  if (value === false) {
    return <XIcon className="mx-auto size-4 text-muted-foreground/45" aria-label="Not included" />;
  }
  if (value === 'partial') {
    return <MinusIcon className="mx-auto size-4 text-muted-foreground" aria-label="Partial" />;
  }
  return <span className="text-sm text-foreground">{value}</span>;
}

/**
 * Feature × plan comparison matrix.
 * Native table + horizontal scroll — simpler than CSS grid role=table.
 */
export function PlanComparison({
  plans,
  features,
  interval: controlledInterval,
  defaultInterval = 'month',
  onIntervalChange,
  showIntervalToggle = false,
  currencyFallback = 'IDR',
  onSelectPlan,
  ariaLabel = 'Plan comparison',
  emptyMessage = 'No plans to compare.',
  className,
  ...props
}: PlanComparisonProps) {
  const [interval, setIntervalValue] = useControllableState(
    controlledInterval,
    defaultInterval,
    onIntervalChange,
  );

  if (plans.length === 0) {
    return (
      <div
        data-slot="plan-comparison-empty"
        className={cn(
          'rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground',
          className,
        )}
        {...props}
      >
        {emptyMessage}
      </div>
    );
  }

  const rows = features ?? deriveFeatures(plans);

  return (
    <div
      data-slot="plan-comparison"
      className={cn('flex w-full min-w-0 flex-col gap-3', className)}
      {...props}
    >
      {showIntervalToggle ? (
        <div className="flex justify-end">
          <BillingIntervalToggle value={interval} onChange={setIntervalValue} />
        </div>
      ) : null}

      <div className="w-full min-w-0 overflow-x-auto rounded-lg border border-border bg-card [-webkit-overflow-scrolling:touch]">
        <table className="w-full min-w-[32rem] border-collapse text-sm" aria-label={ariaLabel}>
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th
                scope="col"
                className="sticky left-0 z-10 w-[9rem] bg-muted/95 px-3 py-3 text-left text-xs font-medium text-muted-foreground backdrop-blur-sm sm:w-[11rem]"
              >
                Feature
              </th>
              {plans.map((plan) => {
                const currency = plan.currency ?? currencyFallback;
                const amount = interval === 'year' ? plan.yearlyAmount : plan.monthlyAmount;
                return (
                  <th
                    key={plan.id}
                    scope="col"
                    className={cn(
                      'min-w-[7.5rem] border-l border-border px-3 py-3 text-center font-normal',
                      plan.recommended && 'bg-primary/5',
                    )}
                  >
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="flex flex-wrap items-center justify-center gap-1.5">
                        <span className="text-sm font-semibold text-foreground">{plan.name}</span>
                        {plan.recommended ? <Badge tone="default">Popular</Badge> : null}
                      </div>
                      <span className="text-sm font-medium tabular-nums text-foreground">
                        {formatMoney(amount, { currency })}
                        <span className="font-normal text-muted-foreground">
                          {interval === 'year' ? '/yr' : '/mo'}
                        </span>
                      </span>
                      {onSelectPlan ? (
                        <Button
                          size="xs"
                          variant={plan.recommended ? 'default' : 'outline'}
                          onClick={() => onSelectPlan(plan.id)}
                        >
                          {plan.ctaLabel ?? 'Select'}
                        </Button>
                      ) : null}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={row.id}
                className={cn(
                  'border-b border-border last:border-b-0',
                  i % 2 === 1 && 'bg-muted/20',
                )}
              >
                <th
                  scope="row"
                  className={cn(
                    'sticky left-0 z-10 px-3 py-2.5 text-left text-sm font-normal text-foreground backdrop-blur-sm',
                    i % 2 === 1 ? 'bg-muted/90' : 'bg-card/95',
                  )}
                >
                  {row.label}
                </th>
                {plans.map((plan) => (
                  <td
                    key={plan.id}
                    className={cn(
                      'border-l border-border px-3 py-2.5 text-center',
                      plan.recommended && 'bg-primary/[0.03]',
                    )}
                  >
                    <CellValue value={row.values[plan.id] ?? false} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
