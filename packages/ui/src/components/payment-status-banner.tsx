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
  success: <CheckCircle2Icon className="size-4 shrink-0" aria-hidden />,
  failed: <AlertCircleIcon className="size-4 shrink-0" aria-hidden />,
  past_due: <AlertCircleIcon className="size-4 shrink-0" aria-hidden />,
  pending: <ClockIcon className="size-4 shrink-0" aria-hidden />,
};

/** Full-border tinted surfaces (no side-stripe accents). */
const TONE_CLASS: Record<PaymentCalloutStatus, string> = {
  success:
    'border-success/25 bg-[color-mix(in_oklch,var(--success)_10%,var(--background))] text-success',
  failed:
    'border-destructive/25 bg-[color-mix(in_oklch,var(--destructive)_9%,var(--background))] text-destructive',
  past_due:
    'border-warning/30 bg-[color-mix(in_oklch,var(--warning)_12%,var(--background))] text-warning',
  pending: 'border-border bg-muted text-foreground',
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
        'flex items-start gap-3 rounded-lg border px-3.5 py-3 shadow-none',
        TONE_CLASS[status],
        className,
      )}
    >
      <span className="mt-0.5 shrink-0">{ICONS[status]}</span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-sm font-medium text-current">{heading}</p>
        {description ? (
          <p className="text-sm leading-relaxed text-foreground/85">{description}</p>
        ) : null}
        {action ? (
          <div className="mt-1.5 flex flex-wrap gap-2 [&_[data-slot=button]]:w-full sm:[&_[data-slot=button]]:w-auto">
            {action}
          </div>
        ) : null}
      </div>
      {dismissible ? (
        <Button
          variant="ghost"
          size="icon-sm"
          className="shrink-0 text-current opacity-70 hover:opacity-100"
          aria-label="Dismiss"
          onClick={onDismiss}
        >
          <XIcon />
        </Button>
      ) : null}
    </div>
  );
}
