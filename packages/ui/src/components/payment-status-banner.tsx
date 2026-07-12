'use client';

import * as React from 'react';
import { AlertCircleIcon, CheckCircle2Icon, ClockIcon, XIcon } from 'lucide-react';
import { cn } from '../lib/cn';
import { paymentCalloutPresentation, type PaymentCalloutStatus } from '../lib/status';
import { Button } from '../primitives/button';

export interface PaymentStatusBannerProps {
  status: PaymentCalloutStatus;
  title?: string;
  description?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
  action?: React.ReactNode;
}

const ICONS: Record<PaymentCalloutStatus, React.ReactNode> = {
  success: <CheckCircle2Icon className="size-5 shrink-0" aria-hidden />,
  failed: <AlertCircleIcon className="size-5 shrink-0" aria-hidden />,
  past_due: <AlertCircleIcon className="size-5 shrink-0" aria-hidden />,
  pending: <ClockIcon className="size-5 shrink-0" aria-hidden />,
};

const TONE_CLASS: Record<PaymentCalloutStatus, string> = {
  success:
    'border-[color-mix(in_oklch,var(--bp-success,#2f6f4e)_35%,transparent)] bg-[color-mix(in_oklch,var(--bp-success,#2f6f4e)_10%,transparent)] text-[var(--bp-success,#2f6f4e)]',
  failed:
    'border-[color-mix(in_oklch,var(--bp-destructive,#c23b2a)_35%,transparent)] bg-[color-mix(in_oklch,var(--bp-destructive,#c23b2a)_10%,transparent)] text-[var(--bp-destructive,#c23b2a)]',
  past_due:
    'border-[color-mix(in_oklch,var(--bp-warning,#b8860b)_35%,transparent)] bg-[color-mix(in_oklch,var(--bp-warning,#b8860b)_12%,transparent)] text-[var(--bp-warning,#8a6500)]',
  pending:
    'border-[var(--bp-border,#e2e8f0)] bg-[var(--bp-muted,#f1f3f5)] text-[var(--bp-foreground,#111)]',
};

export function PaymentStatusBanner({
  status,
  title,
  description,
  dismissible = false,
  onDismiss,
  className,
  action,
}: PaymentStatusBannerProps) {
  const presentation = paymentCalloutPresentation(status);
  const heading = title ?? presentation.label;

  return (
    <div
      data-slot="payment-status-banner"
      role="status"
      className={cn(
        'flex items-start gap-3 rounded-md border px-4 py-3',
        TONE_CLASS[status],
        className,
      )}
    >
      {ICONS[status]}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-sm font-medium text-current">{heading}</p>
        {description ? (
          <p className="text-sm opacity-90 text-[var(--bp-foreground,#111)]">{description}</p>
        ) : null}
        {action ? <div className="mt-1">{action}</div> : null}
      </div>
      {dismissible ? (
        <Button
          variant="ghost"
          size="icon"
          className="size-8 shrink-0"
          aria-label="Dismiss"
          onClick={onDismiss}
        >
          <XIcon className="size-4" />
        </Button>
      ) : null}
    </div>
  );
}
