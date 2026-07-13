'use client';

import { Switch as SwitchPrimitive } from '@base-ui/react/switch';
import { cn } from '../lib/cn';

/**
 * Binary control (Base UI) — port of coss/ui Switch geometry.
 *
 * @see https://github.com/cosscom/coss packages/ui/src/components/switch.tsx
 *
 * Size via `--thumb-size` (coss uses `--spacing(5)` / `--spacing(4)`;
 * we use rem so hosts without Tailwind spacing() still work).
 * Critical checked/unchecked paint also in tokens.css as a safety net.
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
        // coss track formula: h = thumb+2px, w = thumb*2-2px
        'inline-flex shrink-0 items-center rounded-full p-px outline-none',
        'h-[calc(var(--thumb-size)+2px)] w-[calc(var(--thumb-size)*2-2px)]',
        'transition-[background-color,box-shadow] duration-200',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background',
        'data-disabled:cursor-not-allowed data-disabled:opacity-64',
        'data-checked:bg-primary data-unchecked:bg-input',
        // Size tokens (coss: spacing(5) mobile → spacing(4) sm+)
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
          'pointer-events-none block aspect-square h-full origin-left will-change-transform',
          'rounded-[var(--thumb-size)] bg-background shadow-sm/5',
          // coss motion
          '[transition:transform_.15s_ease,border-radius_.15s_ease]',
          // coss checked travel — transform (not CSS translate property)
          'data-unchecked:translate-x-0',
          'data-checked:origin-[var(--thumb-size)_50%]',
          'data-checked:translate-x-[calc(var(--thumb-size)-4px)]',
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
