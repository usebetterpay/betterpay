import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { formatMoney } from '../src/lib/money';
import { PlanGroup } from '../src/components/plan-group';
import { testPlans } from './fixtures';

/** Match Intl currency text that may use NBSP between symbol and amount. */
function moneyText(amount: number) {
  const formatted = formatMoney(amount, { currency: 'IDR' });
  return (_: string, node: Element | null) =>
    Boolean(node?.textContent && node.textContent.replace(/\s/g, ' ') === formatted.replace(/\s/g, ' ') && node.children.length === 0);
}

describe('PlanGroup', () => {
  it('toggles interval and updates plan prices', async () => {
    const user = userEvent.setup();
    render(
      <PlanGroup plans={testPlans} defaultInterval="month" title="Plans" />,
    );

    expect(screen.getByText(moneyText(199_000))).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Yearly' }));

    expect(screen.getByText(moneyText(1_990_000))).toBeInTheDocument();
  });
});
