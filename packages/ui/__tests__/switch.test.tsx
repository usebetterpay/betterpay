import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Switch } from '../src/primitives/switch';

describe('Switch', () => {
  it('calls onCheckedChange when clicked', async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(
      <Switch checked={false} onCheckedChange={onCheckedChange} aria-label="Bill yearly" />,
    );
    await user.click(screen.getByRole('switch', { name: 'Bill yearly' }));
    expect(onCheckedChange).toHaveBeenCalled();
    expect(onCheckedChange.mock.calls[0]?.[0]).toBe(true);
  });
});
