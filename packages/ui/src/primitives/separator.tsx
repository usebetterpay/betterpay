'use client';

import { Separator as SeparatorPrimitive } from '@base-ui/react/separator';
import { cn } from '../lib/cn';

/**
 * Quiet structural rule (Base UI). Prefer over ad-hoc border divs.
 */
function Separator({
  className,
  orientation = 'horizontal',
  ...props
}: SeparatorPrimitive.Props) {
  return (
    <SeparatorPrimitive
      data-slot="separator"
      orientation={orientation}
      className={cn(
        // coss: data-[orientation=...] (Base UI orientation attr)
        'shrink-0 bg-border',
        'data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full',
        'data-[orientation=vertical]:w-px data-[orientation=vertical]:self-stretch',
        // legacy Base UI data-horizontal fallback
        'data-horizontal:h-px data-horizontal:w-full',
        'data-vertical:h-full data-vertical:w-px data-vertical:self-stretch',
        className,
      )}
      {...props}
    />
  );
}

export { Separator };
