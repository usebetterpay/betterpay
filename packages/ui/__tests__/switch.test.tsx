import * as React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Switch } from '../src/primitives/switch';
import { BillingIntervalToggle } from '../src/components/billing-interval-toggle';
import type { BillingInterval } from '../src/types/billing-ui';

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

  it('reflects controlled checked on aria-checked and data attributes', async () => {
    const user = userEvent.setup();
    function Harness() {
      const [on, setOn] = React.useState(false);
      return (
        <Switch
          checked={on}
          onCheckedChange={(c) => setOn(c)}
          aria-label="Notify"
        />
      );
    }
    render(<Harness />);
    const el = screen.getByRole('switch', { name: 'Notify' });
    expect(el).toHaveAttribute('aria-checked', 'false');
    expect(el).toHaveAttribute('data-unchecked');
    await user.click(el);
    expect(el).toHaveAttribute('aria-checked', 'true');
    expect(el).toHaveAttribute('data-checked');
  });
});

describe('BillingIntervalToggle', () => {
  it('toggles value via switch and updates data-interval', async () => {
    const user = userEvent.setup();
    function Harness() {
      const [interval, setInterval] = React.useState<BillingInterval>('month');
      return (
        <BillingIntervalToggle value={interval} onChange={setInterval} />
      );
    }
    render(<Harness />);
    const root = document.querySelector('[data-slot="billing-interval-toggle"]');
    expect(root).toHaveAttribute('data-interval', 'month');
    await user.click(screen.getByRole('switch', { name: 'Bill yearly' }));
    expect(root).toHaveAttribute('data-interval', 'year');
    expect(screen.getByRole('switch', { name: 'Bill yearly' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });
});
