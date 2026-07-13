import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InvoiceTable } from '../src/components/invoice-table';
import { testInvoices } from './fixtures';

describe('InvoiceTable', () => {
  it('sets aria-busy when loading', () => {
    const { container } = render(<InvoiceTable invoices={[]} loading />);
    expect(container.querySelector('[data-slot="invoice-table"]')).toHaveAttribute(
      'aria-busy',
      'true',
    );
  });

  it('renders empty message', () => {
    render(<InvoiceTable invoices={[]} emptyMessage="Nothing here" />);
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
  });

  it('renders invoice rows from real data', () => {
    render(<InvoiceTable invoices={testInvoices} />);
    expect(screen.getByText('INV-001')).toBeInTheDocument();
  });
});
