'use client';

import * as React from 'react';
import { cn } from '../lib/cn';
import { formatMoney } from '../lib/money';
import type { BillingInterval, PlanView } from '../types/billing-ui';
import { Badge } from '../primitives/badge';
import { Button } from '../primitives/button';
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPopup,
  DialogTitle,
  DialogTrigger,
} from '../primitives/dialog';

export interface PlanSwitcherProps {
  plans: PlanView[];
  currentPlanId: string;
  interval?: BillingInterval;
  triggerLabel?: string;
  title?: string;
  description?: string;
  onConfirm?: (planId: string) => void;
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function PlanSwitcher({
  plans,
  currentPlanId,
  interval = 'month',
  triggerLabel = 'Change plan',
  title = 'Change plan',
  description = 'Select a plan that matches your usage. Changes apply on the next billing cycle unless configured otherwise.',
  onConfirm,
  className,
  open,
  onOpenChange,
}: PlanSwitcherProps) {
  const [selected, setSelected] = React.useState(currentPlanId);
  const [internalOpen, setInternalOpen] = React.useState(false);
  const isOpen = open ?? internalOpen;

  const handleOpenChange = (next: boolean) => {
    if (open === undefined) setInternalOpen(next);
    onOpenChange?.(next);
    if (next) setSelected(currentPlanId);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger
        data-slot="plan-switcher-trigger"
        render={<Button variant="outline" className={className} />}
      >
        {triggerLabel}
      </DialogTrigger>
      <DialogPopup className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <ul
          data-slot="plan-switcher-list"
          className="flex max-h-[min(50vh,20rem)] flex-col gap-2 overflow-y-auto overscroll-contain pe-0.5"
        >
          {plans.map((plan) => {
            const amount = interval === 'year' ? plan.yearlyAmount : plan.monthlyAmount;
            const currency = plan.currency ?? 'IDR';
            const active = selected === plan.id;
            const isCurrent = plan.id === currentPlanId;
            return (
              <li key={plan.id}>
                <button
                  type="button"
                  data-slot="plan-switcher-option"
                  onClick={() => setSelected(plan.id)}
                  className={cn(
                    'flex w-full min-h-14 items-start justify-between gap-3 rounded-md border p-3 text-left transition-colors',
                    'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                    active
                      ? 'border-primary bg-[color-mix(in_oklch,var(--primary)_6%,transparent)]'
                      : 'border-border hover:bg-muted',
                  )}
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{plan.name}</span>
                      {isCurrent ? <Badge tone="muted">Current</Badge> : null}
                      {plan.recommended ? <Badge tone="default">Recommended</Badge> : null}
                    </div>
                    {plan.description ? (
                      <span className="line-clamp-2 text-xs text-muted-foreground">
                        {plan.description}
                      </span>
                    ) : null}
                  </div>
                  <span className="shrink-0 text-sm font-medium tabular-nums">
                    {formatMoney(amount, { currency })}
                    <span className="ml-0.5 text-xs font-normal text-muted-foreground">
                      {interval === 'year' ? '/yr' : '/mo'}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Keep current
          </Button>
          <Button
            disabled={selected === currentPlanId}
            onClick={() => {
              onConfirm?.(selected);
              handleOpenChange(false);
            }}
          >
            Confirm change
          </Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}
