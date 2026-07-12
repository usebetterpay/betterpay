'use client';

import * as React from 'react';
import { Switch as BaseSwitch } from '@base-ui/react/switch';
import { cn } from '../lib/cn';

export function Switch({
  className,
  ...props
}: React.ComponentProps<typeof BaseSwitch.Root>) {
  return (
    <BaseSwitch.Root
      data-slot="switch"
      className={cn(
        'peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors',
        'bg-[var(--bp-muted,#e2e8f0)] data-[checked]:bg-[var(--bp-primary,#0f3d4c)]',
        'focus-visible:ring-2 focus-visible:ring-[var(--bp-ring,currentColor)] focus-visible:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <BaseSwitch.Thumb
        data-slot="switch-thumb"
        className={cn(
          'pointer-events-none block size-5 rounded-full bg-white shadow-sm transition-transform',
          'translate-x-0.5 data-[checked]:translate-x-[1.35rem]',
        )}
      />
    </BaseSwitch.Root>
  );
}
