import { Button as ButtonPrimitive } from '@base-ui/react/button';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';

/**
 * Product Button (Base UI).
 * Comfortable hit targets — never chrome-dense.
 */
const buttonVariants = cva(
  [
    'group/button relative inline-flex shrink-0 items-center justify-center gap-2',
    'rounded-lg border border-transparent font-medium whitespace-nowrap select-none',
    'outline-none transition-[color,background-color,border-color,opacity,box-shadow,transform]',
    'duration-[var(--duration,180ms)] ease-[var(--ease-out,cubic-bezier(0.16,1,0.3,1))]',
    'focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/35 focus-visible:ring-offset-1 focus-visible:ring-offset-background',
    'active:translate-y-px',
    'disabled:pointer-events-none disabled:opacity-45',
    'aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/25',
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ].join(' '),
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-xs hover:bg-[var(--primary-hover)] hover:shadow-sm',
        outline:
          'border-border bg-card text-foreground shadow-none hover:bg-muted/80 hover:border-border hover:text-foreground aria-expanded:bg-muted',
        secondary:
          'bg-secondary text-secondary-foreground shadow-none hover:bg-secondary/75 aria-expanded:bg-secondary',
        ghost:
          'text-foreground shadow-none hover:bg-muted/80 hover:text-foreground aria-expanded:bg-muted',
        destructive:
          'bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/30',
        'destructive-outline':
          'border-border bg-card text-destructive shadow-none hover:bg-destructive/8 hover:border-destructive/25',
        link: 'h-auto rounded-none px-0 text-primary leading-normal underline-offset-4 shadow-none hover:underline',
      },
      size: {
        // Padding uses ! so it wins unlayered preflight `button { padding: 0 }`
        // (docs/fumadocs + Tailwind layers — layered utilities alone lose).
        // leading-none after text-* so twMerge keeps the label centered.
        default: 'h-10 min-h-10 px-5! text-sm leading-none',
        xs: 'h-8 min-h-8 gap-1.5 rounded-md px-3! text-xs leading-none [&_svg:not([class*="size-"])]:size-3',
        sm: 'h-9 min-h-9 gap-1.5 rounded-md px-4! text-[0.8125rem] leading-none [&_svg:not([class*="size-"])]:size-3.5',
        lg: 'h-11 min-h-11 gap-2.5 px-6! text-[0.9375rem] leading-none',
        icon: 'size-10 leading-none p-0!',
        'icon-xs': 'size-8 leading-none p-0! [&_svg:not([class*="size-"])]:size-3',
        'icon-sm': 'size-9 leading-none p-0! [&_svg:not([class*="size-"])]:size-3.5',
        'icon-lg': 'size-11 leading-none p-0!',
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
