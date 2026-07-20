'use client';

import * as React from 'react';
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  ClockIcon,
  XIcon,
} from 'lucide-react';
import { cn } from '../lib/cn';
import type { PaymentCalloutStatus } from '../lib/status';
import { Button } from '../primitives/button';

const ICONS: Record<PaymentCalloutStatus, React.ReactNode> = {
  success: <CheckCircle2Icon className="size-4 shrink-0" aria-hidden />,
  failed: <AlertCircleIcon className="size-4 shrink-0" aria-hidden />,
  past_due: <AlertCircleIcon className="size-4 shrink-0" aria-hidden />,
  pending: <ClockIcon className="size-4 shrink-0" aria-hidden />,
};

const TONE: Record<PaymentCalloutStatus, string> = {
  success:
    'border-success/25 bg-[color-mix(in_oklch,var(--success)_8%,var(--card))]',
  failed:
    'border-destructive/25 bg-[color-mix(in_oklch,var(--destructive)_8%,var(--card))]',
  past_due:
    'border-warning/30 bg-[color-mix(in_oklch,var(--warning)_10%,var(--card))]',
  pending: 'border-border bg-muted/40',
};

const DEFAULT_TITLE: Record<PaymentCalloutStatus, string> = {
  success: 'Payment successful',
  failed: 'Payment failed',
  past_due: 'Payment past due',
  pending: 'Payment pending',
};

export interface PaymentStatusBannerProps {
  status: PaymentCalloutStatus;
  title?: string;
  description?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
  actions?: React.ReactNode;
  className?: string;
}

export function PaymentStatusBanner({
  status,
  title,
  description,
  dismissible = false,
  onDismiss,
  actions,
  className,
}: PaymentStatusBannerProps) {
  const heading = title ?? DEFAULT_TITLE[status];

  return (
    <div
      data-slot="payment-status-banner"
      data-status={status}
      role="status"
      className={cn(
        'flex flex-col gap-4 rounded-xl border px-5 py-4 shadow-none sm:flex-row sm:items-center sm:gap-5',
        TONE[status],
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3.5 sm:items-center">
        <span
          className={cn(
            'mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-card/80 text-foreground ring-1 ring-border/60 sm:mt-0',
          )}
        >
          {ICONS[status]}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="text-sm font-semibold tracking-tight text-[var(--foreground)]">{heading}</p>
          {description ? (
            <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{description}</p>
          ) : null}
        </div>
      </div>
      {(actions || dismissible) && (
        <div className="flex shrink-0 flex-wrap items-center gap-2.5 ps-12 sm:ps-0">
          {actions ? (
            <div className="flex flex-wrap items-center gap-2.5 [&_[data-slot=button]]:w-full sm:[&_[data-slot=button]]:w-auto">
              {actions}
            </div>
          ) : null}
          {dismissible ? (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onDismiss}
              className="shrink-0 text-[var(--text-secondary)] hover:text-[var(--foreground)]"
              aria-label="Dismiss"
            >
              <XIcon />
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}
