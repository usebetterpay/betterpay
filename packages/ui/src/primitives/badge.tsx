import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';
import type { BadgeTone } from '../lib/status';

/**
 * Status / meta badge. Prefer `tone` for domain status; `variant` for chrome.
 * Composition via Base UI useRender (`render` prop).
 */
const badgeVariants = cva(
  [
    'group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1',
    'rounded-md border border-transparent px-1.5 text-[0.6875rem] font-medium tracking-wide',
    'whitespace-nowrap uppercase transition-colors',
    'duration-[var(--duration-fast,120ms)] ease-[var(--ease-out,cubic-bezier(0.16,1,0.3,1))]',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
    '[&>svg]:pointer-events-none [&>svg]:size-3',
  ].join(' '),
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground',
        secondary: 'bg-secondary text-secondary-foreground',
        outline: 'border-border bg-card text-foreground',
        ghost: 'text-muted-foreground',
        // Domain tones
        success:
          'border-transparent bg-[color-mix(in_oklch,var(--success)_14%,var(--background))] text-success',
        warning:
          'border-transparent bg-[color-mix(in_oklch,var(--warning)_16%,var(--background))] text-warning',
        danger:
          'border-transparent bg-[color-mix(in_oklch,var(--destructive)_12%,var(--background))] text-destructive',
        muted: 'border-border bg-muted text-muted-foreground normal-case tracking-normal',
        info:
          'border-transparent bg-[color-mix(in_oklch,var(--info)_12%,var(--background))] text-[var(--info)]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

const TONE_TO_VARIANT: Record<
  BadgeTone,
  NonNullable<VariantProps<typeof badgeVariants>['variant']>
> = {
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
      // data-slot is a custom attribute; cast keeps useRender typings happy
      { ...props, 'data-slot': 'badge' } as typeof props & { 'data-slot': string },
    ),
    render,
    state: {
      slot: 'badge',
      variant: resolved,
    },
  });
}

export { Badge, badgeVariants };
