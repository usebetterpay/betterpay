import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';
import type { BadgeTone } from '../lib/status';

/**
 * shadcn base-nova Badge using Base UI `useRender` (supports `render` composition).
 * BetterPay also accepts `tone` for domain status mapping.
 */
const badgeVariants = cva(
  [
    'group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden',
    'rounded-full border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all',
    'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
    '[&>svg]:pointer-events-none [&>svg]:size-3',
  ].join(' '),
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground',
        secondary: 'bg-secondary text-secondary-foreground',
        destructive: 'bg-destructive/10 text-destructive',
        outline: 'border-border text-foreground',
        ghost: 'hover:bg-muted hover:text-muted-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
        // Domain tones (BetterPay status)
        success: 'bg-[color-mix(in_oklch,var(--success)_18%,transparent)] text-[var(--success)]',
        warning: 'bg-[color-mix(in_oklch,var(--warning)_18%,transparent)] text-[var(--warning)]',
        danger: 'bg-destructive/10 text-destructive',
        muted: 'border-border bg-muted text-muted-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

const TONE_TO_VARIANT: Record<BadgeTone, NonNullable<VariantProps<typeof badgeVariants>['variant']>> = {
  default: 'default',
  success: 'success',
  warning: 'warning',
  danger: 'danger',
  muted: 'muted',
};

function Badge({
  className,
  variant,
  tone,
  render,
  ...props
}: useRender.ComponentProps<'span'> &
  VariantProps<typeof badgeVariants> & {
    tone?: BadgeTone;
  }) {
  const resolved = variant ?? (tone ? TONE_TO_VARIANT[tone] : 'default');

  return useRender({
    defaultTagName: 'span',
    props: mergeProps<'span'>(
      {
        className: cn(badgeVariants({ variant: resolved }), className),
      },
      props,
    ),
    render,
    state: {
      slot: 'badge',
      variant: resolved,
    },
  });
}

export { Badge, badgeVariants };
