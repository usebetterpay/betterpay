'use client';

import { Switch as SwitchPrimitive } from '@base-ui/react/switch';
import { cn } from '../lib/cn';

/**
 * Binary control (Base UI). Clear checked/unchecked via track fill + thumb.
 */
function Switch({
  className,
  size = 'default',
  ...props
}: SwitchPrimitive.Root.Props & {
  size?: 'sm' | 'default';
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        'peer group/switch relative inline-flex shrink-0 cursor-pointer items-center rounded-full',
        'border border-transparent outline-none',
        'transition-colors duration-[var(--duration,180ms)] ease-[var(--ease-out,cubic-bezier(0.16,1,0.3,1))]',
        'after:absolute after:-inset-x-2 after:-inset-y-2',
        'focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'data-[size=default]:h-5 data-[size=default]:w-9',
        'data-[size=sm]:h-4 data-[size=sm]:w-7',
        'data-checked:bg-primary data-unchecked:bg-input',
        'data-disabled:cursor-not-allowed data-disabled:opacity-45',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          'pointer-events-none block rounded-full bg-card shadow-xs ring-0',
          'transition-transform duration-[var(--duration,180ms)] ease-[var(--ease-out,cubic-bezier(0.16,1,0.3,1))]',
          'group-data-[size=default]/switch:size-4 group-data-[size=sm]/switch:size-3',
          'group-data-[size=default]/switch:data-unchecked:translate-x-0.5',
          'group-data-[size=sm]/switch:data-unchecked:translate-x-0.5',
          'group-data-[size=default]/switch:data-checked:translate-x-[1.125rem]',
          'group-data-[size=sm]/switch:data-checked:translate-x-[0.875rem]',
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
