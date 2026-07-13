import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { formatMoney } from '../src/lib/money';
import { PlanComparison } from '../src/components/plan-comparison';
import { testPlans } from './fixtures';

function bodyHasMoney(amount: number) {
  const needle = formatMoney(amount, { currency: 'IDR' }).replace(/\s/g, '');
  return document.body.textContent?.replace(/\s/g, '').includes(needle) ?? false;
}

describe('PlanComparison component', () => {
  it('renders empty state when plans is empty', () => {
    render(<PlanComparison plans={[]} />);
    expect(screen.getByText('No plans to compare.')).toBeInTheDocument();
  });

  it('toggles interval when showIntervalToggle is set', async () => {
    const user = userEvent.setup();
    render(
      <PlanComparison plans={testPlans} showIntervalToggle defaultInterval="month" />,
    );

    expect(bodyHasMoney(199_000)).toBe(true);
    expect(screen.getAllByText('/mo').length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: 'Yearly' }));

    expect(bodyHasMoney(1_990_000)).toBe(true);
    expect(screen.getAllByText('/yr').length).toBeGreaterThan(0);
  });
});
