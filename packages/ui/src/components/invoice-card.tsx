import type * as React from 'react';
import { FileTextIcon } from 'lucide-react';
import { cn } from '../lib/cn';
import { formatDisplayDate } from '../lib/dates';
import { formatMoney } from '../lib/money';
import { invoiceStatusPresentation } from '../lib/status';
import type { InvoiceView } from '../types/billing-ui';
import { Badge } from '../primitives/badge';
import { Button } from '../primitives/button';

export interface InvoiceCardProps extends React.ComponentProps<'div'> {
  invoice: InvoiceView;
  onDownload?: (invoiceId: string) => void;
  compact?: boolean;
}

/**
 * Single invoice surface for mobile lists or dense stacks.
 * Pair with InvoiceTable for desktop history.
 */
export function InvoiceCard({
  invoice,
  onDownload,
  compact = false,
  className,
  ...props
}: InvoiceCardProps) {
  const status = invoiceStatusPresentation(invoice.status);
  const currency = invoice.currency ?? 'IDR';

  return (
    <div
      data-slot="invoice-card"
      className={cn(
        'flex flex-col gap-3 rounded-lg border border-border bg-card text-card-foreground shadow-none',
        'transition-colors duration-[var(--duration-fast,120ms)] hover:bg-muted/40',
        'sm:flex-row sm:items-center',
        compact ? 'p-3' : 'p-4',
        className,
      )}
      {...props}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <div
          data-slot="invoice-card-icon"
          className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"
        >
          <FileTextIcon className="size-5" aria-hidden />
        </div>

        <div data-slot="invoice-card-body" className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-medium">{invoice.number}</span>
            <Badge tone={status.tone}>{status.label}</Badge>
          </div>
          <span className="text-xs text-muted-foreground">
            {formatDisplayDate(invoice.issuedAt)}
          </span>
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-between gap-3 ps-[3.25rem] sm:flex-col sm:items-end sm:justify-center sm:gap-1.5 sm:ps-0">
        <span className="text-sm font-medium tabular-nums">
          {formatMoney(invoice.amount, { currency })}
        </span>
        {onDownload ? (
          <Button variant="ghost" size="xs" onClick={() => onDownload(invoice.id)}>
            Download
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export interface InvoiceCardListProps extends React.ComponentProps<'div'> {
  invoices: InvoiceView[];
  onDownload?: (invoiceId: string) => void;
  emptyMessage?: string;
  loading?: boolean;
}

function InvoiceCardListSkeleton() {
  return (
    <div data-slot="invoice-card-list-loading" className="flex flex-col gap-2" aria-hidden>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-lg border border-border p-4"
        >
          <div className="size-10 animate-pulse rounded-md bg-muted" />
          <div className="flex flex-1 flex-col gap-2">
            <div className="h-4 w-1/2 animate-pulse rounded-md bg-muted" />
            <div className="h-3 w-1/3 animate-pulse rounded-md bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function InvoiceCardList({
  invoices,
  onDownload,
  emptyMessage = 'No invoices yet.',
  loading = false,
  className,
  ...props
}: InvoiceCardListProps) {
  if (loading) {
    return (
      <div
        data-slot="invoice-card-list"
        className={cn(className)}
        aria-busy="true"
        {...props}
      >
        <InvoiceCardListSkeleton />
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <p data-slot="invoice-card-list-empty" className="text-sm text-muted-foreground">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div
      data-slot="invoice-card-list"
      className={cn('flex flex-col gap-2', className)}
      {...props}
    >
      {invoices.map((invoice) => (
        <InvoiceCard key={invoice.id} invoice={invoice} onDownload={onDownload} />
      ))}
    </div>
  );
}
