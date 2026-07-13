'use client';

import { Switch as SwitchPrimitive } from '@base-ui/react/switch';
import { cn } from '../lib/cn';

/**
 * Binary control (Base UI).
 *
 * Geometry uses fixed rem sizes (not CSS var calc multiply — invalid without
 * spaces and flaky in some Tailwind pipelines). Thumb uses data-checked on
 * itself for translate, matching Base UI attribute mapping.
 */
function Switch({
  className,
  size = 'default',
  ...props
}: SwitchPrimitive.Root.Props & {
  size?: 'sm' | 'default';
}) {
  const isSm = size === 'sm';

  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        'relative inline-flex shrink-0 cursor-pointer items-center rounded-full border border-transparent p-0.5 outline-none',
        'motion-safe:transition-colors motion-safe:duration-200 motion-reduce:transition-none',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background',
        // Explicit colors (also work if data-* utilities fail to emit)
        'data-checked:bg-primary data-unchecked:bg-input',
        'data-disabled:cursor-not-allowed data-disabled:opacity-64',
        isSm ? 'h-5 w-9' : 'h-6 w-11 sm:h-5 sm:w-9',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          'pointer-events-none block rounded-full bg-background shadow-sm ring-0',
          'motion-safe:transition-transform motion-safe:duration-150 motion-reduce:transition-none',
          isSm ? 'size-3.5' : 'size-5 sm:size-4',
          // Unchecked: flush left (p-0.5 already applied on track)
          'data-unchecked:translate-x-0',
          // Checked: track width - padding - thumb ≈ travel distance
          isSm
            ? 'data-checked:translate-x-4'
            : 'data-checked:translate-x-5 sm:data-checked:translate-x-4',
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
