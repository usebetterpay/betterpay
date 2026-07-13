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
  className?: string;
}

export function InvoiceTable({
  invoices,
  title = 'Invoices',
  description = 'Billing history for this account.',
  emptyMessage = 'No invoices yet.',
  onDownload,
  className,
}: InvoiceTableProps) {
  return (
    <Card data-slot="invoice-table" className={cn(className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="px-0 pb-0 sm:px-0">
        {invoices.length === 0 ? (
          <p
            data-slot="invoice-table-empty"
            className="px-5 pb-5 text-sm text-muted-foreground"
          >
            {emptyMessage}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Number</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                {onDownload ? <TableHead className="text-right"> </TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => {
                const status = invoiceStatusPresentation(invoice.status);
                const currency = invoice.currency ?? 'IDR';
                return (
                  <TableRow key={invoice.id}>
                    <TableCell>{formatDisplayDate(invoice.issuedAt)}</TableCell>
                    <TableCell className="font-medium">{invoice.number}</TableCell>
                    <TableCell>
                      <Badge tone={status.tone}>{status.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(invoice.amount, { currency })}
                    </TableCell>
                    {onDownload ? (
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDownload(invoice.id)}
                          disabled={!invoice.downloadUrl && !onDownload}
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
