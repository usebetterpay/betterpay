import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BillingPortal } from '../src/components/billing-portal';
import { testInvoices, testPlans, testSubscription } from './fixtures';

describe('BillingPortal', () => {
  it('renders title and summary without throwing', () => {
    render(
      <BillingPortal
        subscription={testSubscription}
        plans={testPlans}
        invoices={testInvoices}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Billing' })).toBeInTheDocument();
    expect(screen.getByText('Pro')).toBeInTheDocument();
    expect(screen.getByText(/Subscription · Monthly/)).toBeInTheDocument();
  });

  it('marks invoice table busy when invoicesLoading', () => {
    const { container } = render(
      <BillingPortal
        subscription={testSubscription}
        invoices={[]}
        invoiceLayout="table"
        invoicesLoading
      />,
    );
    expect(container.querySelector('[data-slot="invoice-table"]')).toHaveAttribute(
      'aria-busy',
      'true',
    );
  });
});
