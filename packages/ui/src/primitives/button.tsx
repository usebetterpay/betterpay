import { Button as ButtonPrimitive } from '@base-ui/react/button';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';

/**
 * Product Button (Base UI). Dense, restrained.
 * Link composition: render={<a href>} nativeButton={false}
 */
const buttonVariants = cva(
  [
    'group/button inline-flex shrink-0 items-center justify-center gap-1.5',
    'rounded-md border border-transparent font-medium whitespace-nowrap select-none',
    'outline-none transition-[color,background-color,border-color,box-shadow,opacity,transform]',
    'duration-[var(--duration,180ms)] ease-[var(--ease-out,cubic-bezier(0.16,1,0.3,1))]',
    'focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    'active:translate-y-px',
    'disabled:pointer-events-none disabled:opacity-45',
    'aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/25',
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ].join(' '),
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-xs hover:bg-primary/90',
        outline:
          'border-border bg-card text-foreground shadow-xs hover:bg-muted hover:text-foreground aria-expanded:bg-muted',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary',
        ghost:
          'text-foreground hover:bg-muted hover:text-foreground aria-expanded:bg-muted',
        destructive:
          'bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/30',
        'destructive-outline':
          'border-border bg-card text-destructive hover:bg-destructive/10 hover:border-destructive/30',
        link: 'h-auto rounded-none px-0 text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 min-h-9 px-3.5 text-sm',
        xs: 'h-7 min-h-7 gap-1 rounded-md px-2 text-xs [&_svg:not([class*="size-"])]:size-3',
        sm: 'h-8 min-h-8 gap-1.5 px-3 text-[0.8125rem] [&_svg:not([class*="size-"])]:size-3.5',
        lg: 'h-10 min-h-10 gap-2 px-4 text-sm',
        icon: 'size-9',
        'icon-xs': 'size-7 [&_svg:not([class*="size-"])]:size-3',
        'icon-sm': 'size-8 [&_svg:not([class*="size-"])]:size-3.5',
        'icon-lg': 'size-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export type ButtonProps = ButtonPrimitive.Props & VariantProps<typeof buttonVariants>;

function Button({ className, variant = 'default', size = 'default', ...props }: ButtonProps) {
  return (
    <ButtonPrimitive
      data-slot="button"
      data-variant={variant ?? undefined}
      data-size={size ?? undefined}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
