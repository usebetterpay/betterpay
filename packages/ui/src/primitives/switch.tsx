'use client';

import { Switch as SwitchPrimitive } from '@base-ui/react/switch';
import { cn } from '../lib/cn';

/**
 * Binary control (Base UI) — aligned with coss/ui Switch.
 *
 * Size is driven by CSS variable `--thumb-size` (see tokens.css).
 * Default: 1.25rem mobile, 1rem from sm up (coss: --spacing(5) / --spacing(4)).
 *
 * Geometry + checked/unchecked paint live in tokens.css so visuals work even
 * when Tailwind `data-checked:*` utilities fail to emit.
 */
function Switch({
  className,
  size = 'default',
  style,
  ...props
}: SwitchPrimitive.Root.Props & {
  size?: 'sm' | 'default';
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      style={style}
      className={cn(
        // Structure only — paint/geometry in tokens.css [data-slot=switch]
        'bp-switch inline-flex shrink-0 cursor-pointer items-center rounded-full p-px outline-none',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background',
        'data-disabled:cursor-not-allowed data-disabled:opacity-64',
        // coss-compatible size hooks (also set via CSS defaults)
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
          'bp-switch-thumb pointer-events-none block aspect-square h-full origin-left bg-background shadow-sm/5 will-change-transform',
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
