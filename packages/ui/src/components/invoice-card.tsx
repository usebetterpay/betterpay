'use client';

import { FileTextIcon } from 'lucide-react';
import { cn } from '../lib/cn';
import { formatDisplayDate } from '../lib/dates';
import { formatMoney } from '../lib/money';
import { invoiceStatusPresentation } from '../lib/status';
import type { InvoiceView } from '../types/billing-ui';
import { Badge } from '../primitives/badge';
import { Button } from '../primitives/button';

export interface InvoiceCardProps {
  invoice: InvoiceView;
  onDownload?: (invoiceId: string) => void;
  compact?: boolean;
  className?: string;
}

export function InvoiceCard({
  invoice,
  onDownload,
  compact = false,
  className,
}: InvoiceCardProps) {
  const status = invoiceStatusPresentation(invoice.status);
  const currency = invoice.currency ?? 'IDR';

  return (
    <article
      data-slot="invoice-card"
      className={cn(
        'flex flex-col gap-4 rounded-xl border border-border/70 bg-card text-card-foreground shadow-none',
        compact ? 'p-4' : 'p-5',
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3.5">
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted/70 text-muted-foreground"
          aria-hidden
        >
          <FileTextIcon className="size-5" />
        </div>
        <div data-slot="invoice-card-body" className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="truncate text-sm font-medium">{invoice.number}</span>
            <Badge tone={status.tone}>{status.label}</Badge>
          </div>
          <span className="text-sm text-muted-foreground">
            {formatDisplayDate(invoice.issuedAt)}
          </span>
        </div>
      </div>
      <div className="flex shrink-0 items-center justify-between gap-4 ps-[3.375rem] sm:flex-col sm:items-end sm:justify-center sm:gap-2 sm:ps-0">
        <span className="text-base font-semibold tabular-nums">
          {formatMoney(invoice.amount, { currency })}
        </span>
        {onDownload ? (
          <Button variant="outline" size="sm" onClick={() => onDownload(invoice.id)}>
            Download
          </Button>
        ) : null}
      </div>
    </article>
  );
}

export interface InvoiceCardListProps {
  invoices: InvoiceView[];
  onDownload?: (invoiceId: string) => void;
  emptyMessage?: string;
  loading?: boolean;
  compact?: boolean;
  className?: string;
}

function InvoiceCardListLoading() {
  return (
    <div data-slot="invoice-card-list-loading" className="flex flex-col gap-3" aria-hidden>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="flex items-center gap-3.5 rounded-xl border border-border p-5"
        >
          <div className="size-10 animate-pulse rounded-lg bg-muted" />
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
  compact,
  className,
}: InvoiceCardListProps) {
  if (loading) {
    return (
      <div data-slot="invoice-card-list" className={cn(className)} aria-busy>
        <InvoiceCardListLoading />
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
      className={cn('flex flex-col gap-3', className)}
    >
      {invoices.map((invoice) => (
        <InvoiceCard
          key={invoice.id}
          invoice={invoice}
          onDownload={onDownload}
          compact={compact}
        />
      ))}
    </div>
  );
}
