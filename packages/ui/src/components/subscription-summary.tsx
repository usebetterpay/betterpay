'use client';

import { cn } from '../lib/cn';
import { formatMoney } from '../lib/money';
import { subscriptionStatusPresentation } from '../lib/status';
import type { SubscriptionView } from '../types/billing-ui';
import { Badge } from '../primitives/badge';
import { Button } from '../primitives/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../primitives/card';
import { Separator } from '../primitives/separator';

export interface SubscriptionSummaryProps {
  subscription: SubscriptionView;
  onUpgrade?: () => void;
  onCancel?: () => void;
  className?: string;
  upgradeLabel?: string;
  cancelLabel?: string;
}

function formatDate(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

export function SubscriptionSummary({
  subscription,
  onUpgrade,
  onCancel,
  className,
  upgradeLabel = 'Change plan',
  cancelLabel = 'Cancel',
}: SubscriptionSummaryProps) {
  const status = subscriptionStatusPresentation(subscription.status);
  const currency = subscription.currency ?? 'IDR';
  const periodEnd = formatDate(subscription.currentPeriodEnd ?? null);
  const nextAmount =
    subscription.nextAmount != null
      ? formatMoney(subscription.nextAmount, { currency })
      : null;

  return (
    <Card data-slot="subscription-summary" className={cn(className)}>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1.5">
            <CardTitle>{subscription.planName}</CardTitle>
            <CardDescription>Subscription · {subscription.interval}</CardDescription>
          </div>
          <Badge tone={status.tone}>{status.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <dl className="grid gap-3 sm:grid-cols-2">
          {nextAmount ? (
            <div className="flex flex-col gap-1">
              <dt className="text-xs text-[var(--bp-muted-foreground,#64748b)]">Next charge</dt>
              <dd className="text-sm font-medium tabular-nums">{nextAmount}</dd>
            </div>
          ) : null}
          {periodEnd ? (
            <div className="flex flex-col gap-1">
              <dt className="text-xs text-[var(--bp-muted-foreground,#64748b)]">
                {subscription.cancelAtPeriodEnd ? 'Ends on' : 'Renews on'}
              </dt>
              <dd className="text-sm font-medium">{periodEnd}</dd>
            </div>
          ) : null}
          {subscription.paymentMethodLabel ? (
            <div className="flex flex-col gap-1 sm:col-span-2">
              <dt className="text-xs text-[var(--bp-muted-foreground,#64748b)]">Payment method</dt>
              <dd className="text-sm font-medium">{subscription.paymentMethodLabel}</dd>
            </div>
          ) : null}
        </dl>
        {subscription.cancelAtPeriodEnd ? (
          <>
            <Separator />
            <p className="text-sm text-[var(--bp-muted-foreground,#64748b)]">
              Access continues until the period ends. You will not be charged again.
            </p>
          </>
        ) : null}
      </CardContent>
      {(onUpgrade || onCancel) && (
        <CardFooter className="flex flex-wrap gap-2">
          {onUpgrade ? (
            <Button variant="default" onClick={onUpgrade}>
              {upgradeLabel}
            </Button>
          ) : null}
          {onCancel ? (
            <Button variant="outline" onClick={onCancel}>
              {cancelLabel}
            </Button>
          ) : null}
        </CardFooter>
      )}
    </Card>
  );
}
