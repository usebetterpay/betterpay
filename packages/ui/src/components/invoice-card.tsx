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
 * Single invoice row for mobile lists or dense stacks.
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
        'flex items-center gap-3 rounded-lg border border-border bg-card text-card-foreground shadow-xs',
        'transition-colors duration-[var(--duration-fast,120ms)] hover:bg-muted/40',
        compact ? 'p-3' : 'gap-4 p-4',
        className,
      )}
      {...props}
    >
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
        <span className="text-xs text-muted-foreground">{formatDisplayDate(invoice.issuedAt)}</span>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1.5">
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
}

export function InvoiceCardList({
  invoices,
  onDownload,
  emptyMessage = 'No invoices yet.',
  className,
  ...props
}: InvoiceCardListProps) {
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
