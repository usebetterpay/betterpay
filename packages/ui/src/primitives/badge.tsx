import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';
import type { BadgeTone } from '../lib/status';

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      tone: {
        default:
          'border-transparent bg-[var(--bp-primary,#0f3d4c)] text-[var(--bp-primary-foreground,#fff)]',
        success:
          'border-transparent bg-[color-mix(in_oklch,var(--bp-success,#2f6f4e)_18%,transparent)] text-[var(--bp-success,#2f6f4e)]',
        warning:
          'border-transparent bg-[color-mix(in_oklch,var(--bp-warning,#b8860b)_18%,transparent)] text-[var(--bp-warning,#8a6500)]',
        danger:
          'border-transparent bg-[color-mix(in_oklch,var(--bp-destructive,#c23b2a)_18%,transparent)] text-[var(--bp-destructive,#c23b2a)]',
        muted:
          'border-[var(--bp-border,#e2e8f0)] bg-[var(--bp-muted,#f1f3f5)] text-[var(--bp-muted-foreground,#64748b)]',
      },
    },
    defaultVariants: {
      tone: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  tone?: BadgeTone;
}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return (
    <span data-slot="badge" className={cn(badgeVariants({ tone }), className)} {...props} />
  );
}

export { badgeVariants };
