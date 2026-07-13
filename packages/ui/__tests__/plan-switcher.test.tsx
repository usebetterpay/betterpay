import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlanSwitcher } from '../src/components/plan-switcher';
import { testPlans } from './fixtures';

describe('PlanSwitcher', () => {
  it('uses radiogroup semantics and confirms a new plan', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <PlanSwitcher
        plans={testPlans}
        currentPlanId="pro"
        onConfirm={onConfirm}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Change plan' }));
    expect(screen.getByRole('radiogroup', { name: 'Change plan' })).toBeInTheDocument();

    const free = screen.getByRole('radio', { name: /Free/i });
    await user.click(free);
    expect(free).toHaveAttribute('aria-checked', 'true');

    await user.click(screen.getByRole('button', { name: 'Confirm change' }));
    expect(onConfirm).toHaveBeenCalledWith('free');
  });

  it('disables confirm when current plan stays selected', async () => {
    const user = userEvent.setup();
    render(<PlanSwitcher plans={testPlans} currentPlanId="pro" />);
    await user.click(screen.getByRole('button', { name: 'Change plan' }));
    expect(screen.getByRole('button', { name: 'Confirm change' })).toBeDisabled();
  });
});
