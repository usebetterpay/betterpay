import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from '../src/primitives/badge';

describe('Badge', () => {
  it('emits data-slot=badge on the root', () => {
    render(<Badge>Paid</Badge>);
    expect(screen.getByText('Paid')).toHaveAttribute('data-slot', 'badge');
  });
});
