import * as React from 'react';
import { cn } from '../lib/cn';

/**
 * Surface container.
 * Padding lives on header / content / footer (not only outer py) so sections never crush.
 */
function Card({
  className,
  size = 'default',
  elevated = false,
  ...props
}: React.ComponentProps<'div'> & {
  size?: 'default' | 'sm';
  elevated?: boolean;
}) {
  return (
    <div
      data-slot="card"
      data-size={size}
      className={cn(
        'group/card flex min-w-0 flex-col overflow-hidden rounded-xl bg-card text-card-foreground',
        'ring-1 ring-border/80 shadow-none',
        elevated && 'shadow-sm ring-border/60',
        size === 'sm' && 'text-sm',
        className,
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        'grid auto-rows-min items-start gap-2.5 px-6 pt-6 pb-1',
        'group-data-[size=sm]/card:gap-2 group-data-[size=sm]/card:px-5 group-data-[size=sm]/card:pt-5',
        'has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-action]:gap-x-4',
        className,
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        'text-base leading-snug font-semibold tracking-tight text-foreground',
        className,
      )}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-description"
      className={cn('text-sm leading-relaxed text-muted-foreground', className)}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        'col-start-2 row-span-2 row-start-1 self-start justify-self-end ps-3',
        className,
      )}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-content"
      className={cn(
        'px-6 py-5 group-data-[size=sm]/card:px-5 group-data-[size=sm]/card:py-4',
        // When footer follows, content can sit flush above the divider
        'group-has-data-[slot=card-footer]/card:pb-5',
        className,
      )}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        // Flush to card bottom — never leave a white strip under the CTA
        'mt-auto flex flex-wrap items-center justify-end gap-3 border-t border-border/70 bg-muted/25 px-6 py-4',
        'rounded-b-[inherit]',
        'group-data-[size=sm]/card:gap-2.5 group-data-[size=sm]/card:px-5 group-data-[size=sm]/card:py-3.5',
        className,
      )}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
};
