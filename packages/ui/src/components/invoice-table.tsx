import { cn } from '../lib/cn';
import { formatDisplayDate } from '../lib/dates';
import { formatMoney } from '../lib/money';
import { invoiceStatusPresentation } from '../lib/status';
import type { InvoiceView } from '../types/billing-ui';
import { Badge } from '../primitives/badge';
import { Button } from '../primitives/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../primitives/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../primitives/table';

export interface InvoiceTableProps {
  invoices: InvoiceView[];
  title?: string;
  description?: string;
  emptyMessage?: string;
  onDownload?: (invoiceId: string) => void;
  /** Show skeleton rows while host loads invoices. */
  loading?: boolean;
  className?: string;
}

function InvoiceTableSkeleton() {
  return (
    <div data-slot="invoice-table-loading" className="flex flex-col gap-4 px-6 pb-6" aria-hidden>
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-4">
          <div className="h-4 w-24 animate-pulse rounded-md bg-muted" />
          <div className="h-4 flex-1 animate-pulse rounded-md bg-muted" />
          <div className="h-4 w-20 animate-pulse rounded-md bg-muted" />
          <div className="h-4 w-28 animate-pulse rounded-md bg-muted" />
        </div>
      ))}
    </div>
  );
}

export function InvoiceTable({
  invoices,
  title = 'Invoices',
  description = 'Billing history for this account.',
  emptyMessage = 'No invoices yet.',
  onDownload,
  loading = false,
  className,
}: InvoiceTableProps) {
  return (
    <Card
      data-slot="invoice-table"
      className={cn(className)}
      aria-busy={loading || undefined}
    >
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="px-0 pb-0">
        {loading ? (
          <InvoiceTableSkeleton />
        ) : invoices.length === 0 ? (
          <p
            data-slot="invoice-table-empty"
            className="px-6 pb-6 text-sm text-muted-foreground"
          >
            {emptyMessage}
          </p>
        ) : (
          <Table className="min-w-[28rem]">
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Number</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                {onDownload ? (
                  <TableHead className="w-px text-right">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => {
                const status = invoiceStatusPresentation(invoice.status);
                const currency = invoice.currency ?? 'IDR';
                return (
                  <TableRow key={invoice.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatDisplayDate(invoice.issuedAt)}
                    </TableCell>
                    <TableCell className="font-medium">{invoice.number}</TableCell>
                    <TableCell>
                      <Badge tone={status.tone}>{status.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums whitespace-nowrap">
                      {formatMoney(invoice.amount, { currency })}
                    </TableCell>
                    {onDownload ? (
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDownload(invoice.id)}
                        >
                          Download
                        </Button>
                      </TableCell>
                    ) : null}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
