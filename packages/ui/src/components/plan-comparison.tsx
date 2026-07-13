import type * as React from 'react';
import { CheckIcon, MinusIcon, XIcon } from 'lucide-react';
import { cn } from '../lib/cn';
import { formatMoney } from '../lib/money';
import type { BillingInterval, PlanView } from '../types/billing-ui';
import { Badge } from '../primitives/badge';
import { Button } from '../primitives/button';

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
  interval?: BillingInterval;
  currencyFallback?: string;
  onSelectPlan?: (planId: string) => void;
  ariaLabel?: string;
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
 * Feature × plan comparison matrix for marketing / docs pricing pages.
 */
export function PlanComparison({
  plans,
  features,
  interval = 'month',
  currencyFallback = 'IDR',
  onSelectPlan,
  ariaLabel = 'Plan comparison',
  className,
  ...props
}: PlanComparisonProps) {
  const rows = features ?? deriveFeatures(plans);
  const colCount = plans.length + 1;

  return (
    <div
      data-slot="plan-comparison"
      role="table"
      aria-label={ariaLabel}
      className={cn(
        'w-full overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-xs',
        className,
      )}
      {...props}
    >
      <div
        role="rowgroup"
        className="overflow-x-auto"
      >
        <div
          role="row"
          className="grid min-w-[36rem] border-b border-border bg-muted/40"
          style={{ gridTemplateColumns: `minmax(10rem,1.2fr) repeat(${plans.length}, minmax(7rem,1fr))` }}
        >
          <div role="columnheader" className="p-3 text-left text-xs font-medium text-muted-foreground">
            Feature
          </div>
          {plans.map((plan) => {
            const currency = plan.currency ?? currencyFallback;
            const amount = interval === 'year' ? plan.yearlyAmount : plan.monthlyAmount;
            return (
              <div
                key={plan.id}
                role="columnheader"
                className={cn(
                  'flex flex-col items-center gap-2 border-l border-border p-3 text-center',
                  plan.recommended && 'bg-primary/5',
                )}
              >
                <div className="flex flex-wrap items-center justify-center gap-1.5">
                  <span className="text-sm font-semibold">{plan.name}</span>
                  {plan.recommended ? <Badge tone="default">Popular</Badge> : null}
                </div>
                <span className="text-sm font-medium tabular-nums">
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
            );
          })}
        </div>

        {rows.map((row, i) => (
          <div
            key={row.id}
            role="row"
            className={cn(
              'grid min-w-[36rem] border-b border-border last:border-b-0',
              i % 2 === 1 && 'bg-muted/20',
            )}
            style={{
              gridTemplateColumns: `minmax(10rem,1.2fr) repeat(${colCount - 1}, minmax(7rem,1fr))`,
            }}
          >
            <div role="cell" className="p-3 text-left text-sm text-foreground">
              {row.label}
            </div>
            {plans.map((plan) => (
              <div
                key={plan.id}
                role="cell"
                className={cn(
                  'flex items-center justify-center border-l border-border p-3',
                  plan.recommended && 'bg-primary/[0.03]',
                )}
              >
                <CellValue value={row.values[plan.id] ?? false} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
