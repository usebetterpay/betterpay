import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CancelFlow } from '../src/components/cancel-flow';

describe('CancelFlow', () => {
  it('opens dialog, selects reason, and confirms', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<CancelFlow planName="Pro" onConfirm={onConfirm} />);

    await user.click(screen.getByRole('button', { name: 'Cancel subscription' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.click(screen.getByLabelText('Too expensive'));
    await user.click(screen.getByRole('button', { name: 'Confirm cancel' }));

    expect(onConfirm).toHaveBeenCalledWith({ reasonId: 'too_expensive' });
  });

  it('keep subscription closes without confirm', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<CancelFlow onConfirm={onConfirm} />);

    await user.click(screen.getByRole('button', { name: 'Cancel subscription' }));
    await user.click(screen.getByRole('button', { name: 'Keep subscription' }));

    expect(onConfirm).not.toHaveBeenCalled();
  });
});
