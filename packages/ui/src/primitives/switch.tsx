'use client';

import { Switch as SwitchPrimitive } from '@base-ui/react/switch';
import { cn } from '../lib/cn';

/**
 * Binary control (Base UI).
 *
 * Pattern notes (from production Base UI kits like coss/ui):
 * - Size via CSS custom property `--thumb-size` so track width = 2× thumb
 * - Thumb motion uses `data-checked:translate-x` on the thumb itself
 *   (Base UI stamps data-checked/unchecked on both root and thumb)
 * - Avoid fragile group-compound selectors for the checked transform
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
        // Track sized from --thumb-size (coss-style geometry)
        'inline-flex shrink-0 cursor-pointer items-center rounded-full p-px outline-none',
        'motion-safe:transition-[background-color,box-shadow] motion-safe:duration-200',
        'motion-reduce:transition-none',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background',
        'data-checked:bg-primary data-unchecked:bg-input',
        'data-disabled:cursor-not-allowed data-disabled:opacity-64',
        // Mobile-first larger thumb; denser from sm. Rem keeps geometry
        // stable without relying on host --spacing() theme helpers.
        size === 'sm'
          ? '[--thumb-size:0.875rem] sm:[--thumb-size:0.75rem]'
          : '[--thumb-size:1.25rem] sm:[--thumb-size:1rem]',
        'h-[calc(var(--thumb-size)+2px)] w-[calc(var(--thumb-size)*2-2px)]',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          'pointer-events-none block aspect-square h-full rounded-full bg-background shadow-sm/5',
          'origin-left will-change-transform',
          'motion-safe:[transition:translate_.15s,border-radius_.15s,scale_.1s_.1s,transform-origin_.15s]',
          'motion-reduce:transition-none',
          // Active squash (optional polish)
          'motion-safe:in-[[role=switch]:active]:not-data-disabled:scale-x-110',
          // Checked state on the thumb — reliable Base UI data attrs
          'data-checked:origin-[var(--thumb-size)_50%]',
          'data-checked:translate-x-[calc(var(--thumb-size)-4px)]',
          'data-unchecked:translate-x-0',
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
