'use client';

import { cn } from '../lib/cn';
import { formatDisplayDate } from '../lib/dates';
import { formatBillingIntervalLabel } from '../lib/labels';
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
  const periodEnd = subscription.currentPeriodEnd
    ? formatDisplayDate(subscription.currentPeriodEnd)
    : null;
  const nextAmount =
    subscription.nextAmount != null
      ? formatMoney(subscription.nextAmount, { currency })
      : null;

  return (
    <Card data-slot="subscription-summary" elevated className={cn(className)}>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-2">
            <CardTitle className="text-lg">{subscription.planName}</CardTitle>
            <CardDescription>
              Subscription · {formatBillingIntervalLabel(subscription.interval)}
            </CardDescription>
          </div>
          <Badge tone={status.tone}>{status.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <dl className="grid gap-5 sm:grid-cols-2">
          {nextAmount ? (
            <div className="flex flex-col gap-1.5">
              <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Next charge
              </dt>
              <dd className="text-base font-semibold tabular-nums tracking-tight">{nextAmount}</dd>
            </div>
          ) : null}
          {periodEnd ? (
            <div className="flex flex-col gap-1.5">
              <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {subscription.cancelAtPeriodEnd ? 'Ends on' : 'Renews on'}
              </dt>
              <dd className="text-base font-semibold tracking-tight">{periodEnd}</dd>
            </div>
          ) : null}
          {subscription.paymentMethodLabel ? (
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Payment method
              </dt>
              <dd className="text-base font-semibold tracking-tight">
                {subscription.paymentMethodLabel}
              </dd>
            </div>
          ) : null}
        </dl>
        {subscription.cancelAtPeriodEnd ? (
          <>
            <Separator />
            <p className="text-sm leading-relaxed text-muted-foreground">
              Access continues until the period ends. You will not be charged again.
            </p>
          </>
        ) : null}
      </CardContent>
      {(onUpgrade || onCancel) && (
        <CardFooter className="justify-end gap-3">
          {onCancel ? (
            <Button variant="outline" onClick={onCancel}>
              {cancelLabel}
            </Button>
          ) : null}
          {onUpgrade ? (
            <Button variant="default" onClick={onUpgrade}>
              {upgradeLabel}
            </Button>
          ) : null}
        </CardFooter>
      )}
    </Card>
  );
}
