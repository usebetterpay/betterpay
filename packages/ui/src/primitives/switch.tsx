'use client';

import { Switch as SwitchPrimitive } from '@base-ui/react/switch';
import { cn } from '../lib/cn';

/**
 * Binary control (Base UI) — geometry aligned with coss/ui + shadcn base-nova.
 *
 * @see https://coss.com/ui/docs/components/switch
 * @see https://ui.shadcn.com/docs/components/base/switch
 *
 * Size via `--thumb-size`. Track = h(thumb+2px) × w(thumb*2-2px), 1px pad.
 * Thumb travel = thumb − 4px (matches free space inside the track).
 * Motion lives in tokens.css only — do not also set Tailwind translate-x here
 * or the thumb slides past the track (double transform).
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
        'bp-switch relative inline-flex shrink-0 cursor-pointer items-center overflow-hidden rounded-full p-px outline-none select-none',
        'transition-[background-color,box-shadow] duration-200',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background',
        'data-disabled:cursor-not-allowed data-disabled:opacity-50',
        // Size hooks (coss: spacing(5) mobile → spacing(4) sm+)
        size === 'sm'
          ? '[--thumb-size:0.875rem]'
          : '[--thumb-size:1.25rem] sm:[--thumb-size:1rem]',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          'bp-switch-thumb pointer-events-none block shrink-0 rounded-full bg-background shadow-sm ring-0',
          'will-change-transform',
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
