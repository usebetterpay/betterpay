import * as React from 'react';
import { Button as BaseButton } from '@base-ui/react/button';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium',
    'transition-colors outline-none',
    'focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--bp-ring,currentColor)]',
    'disabled:pointer-events-none disabled:opacity-50',
    '[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  ].join(' '),
  {
    variants: {
      variant: {
        default:
          'bg-[var(--bp-primary,#0f3d4c)] text-[var(--bp-primary-foreground,#fff)] hover:opacity-90',
        secondary:
          'bg-[var(--bp-muted,#f1f3f5)] text-[var(--bp-foreground,#111)] hover:opacity-90',
        outline:
          'border border-[var(--bp-border,#e2e8f0)] bg-transparent hover:bg-[var(--bp-muted,#f1f3f5)]',
        ghost: 'hover:bg-[var(--bp-muted,#f1f3f5)]',
        destructive:
          'bg-[var(--bp-destructive,#c23b2a)] text-white hover:opacity-90',
        link: 'text-[var(--bp-primary,#0f3d4c)] underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 min-h-10 px-4 py-2',
        sm: 'h-9 min-h-9 rounded-md px-3 text-xs',
        lg: 'h-11 min-h-11 rounded-md px-6',
        icon: 'size-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ComponentPropsWithoutRef<typeof BaseButton>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLElement, ButtonProps>(
  function Button({ className, variant, size, ...props }, ref) {
    return (
      <BaseButton
        ref={ref}
        data-slot="button"
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);

export { buttonVariants };
