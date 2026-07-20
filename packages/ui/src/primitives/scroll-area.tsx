'use client';

// Scroll area — Fluid Functionalism / Lina overlay scrollbar on Base UI.
// Native overflow fallback on touch-primary devices.
// @see https://www.fluidfunctionalism.com/r/base/scroll-area.json

import {
  createContext,
  forwardRef,
  useContext,
  type ComponentPropsWithoutRef,
  type ComponentRef,
  type Ref,
} from 'react';
import { ScrollArea as ScrollAreaPrimitive } from '@base-ui/react/scroll-area';
import { cn } from '../lib/cn';
import { useTouchPrimary } from '../hooks/use-touch-primary';

const ScrollAreaContext = createContext(false);

type Orientation = 'vertical' | 'horizontal' | 'both';

export interface ScrollAreaProps extends ComponentPropsWithoutRef<'div'> {
  viewportClassName?: string;
  /** Which axes get scrollbars. Defaults to `"vertical"`. */
  orientation?: Orientation;
}

const ScrollArea = forwardRef<
  ComponentRef<typeof ScrollAreaPrimitive.Root>,
  ScrollAreaProps
>(function ScrollArea(
  { className, children, viewportClassName, orientation = 'vertical', ...props },
  ref,
) {
  const isTouch = useTouchPrimary();

  return (
    <ScrollAreaContext.Provider value={isTouch}>
      {isTouch ? (
        <div
          ref={ref as Ref<HTMLDivElement>}
          role="group"
          data-slot="scroll-area"
          aria-roledescription="scroll area"
          className={cn('relative overflow-hidden', className)}
          {...props}
        >
          <div
            data-slot="scroll-area-viewport"
            className={cn(
              'size-full rounded-[inherit]',
              orientation === 'vertical' && 'overflow-y-auto',
              orientation === 'horizontal' && 'overflow-x-auto',
              orientation === 'both' && 'overflow-auto',
              viewportClassName,
            )}
            tabIndex={0}
          >
            {children}
          </div>
        </div>
      ) : (
        <ScrollAreaPrimitive.Root
          ref={ref}
          data-slot="scroll-area"
          className={cn('relative overflow-hidden', className)}
          {...props}
        >
          <ScrollAreaPrimitive.Viewport
            data-slot="scroll-area-viewport"
            className={cn('size-full rounded-[inherit]', viewportClassName)}
          >
            <ScrollAreaPrimitive.Content>{children}</ScrollAreaPrimitive.Content>
          </ScrollAreaPrimitive.Viewport>
          {orientation !== 'horizontal' ? <ScrollBar orientation="vertical" /> : null}
          {orientation !== 'vertical' ? <ScrollBar orientation="horizontal" /> : null}
          {orientation === 'both' ? <ScrollAreaPrimitive.Corner /> : null}
        </ScrollAreaPrimitive.Root>
      )}
    </ScrollAreaContext.Provider>
  );
});

ScrollArea.displayName = 'ScrollArea';

const ScrollBar = forwardRef<
  ComponentRef<typeof ScrollAreaPrimitive.Scrollbar>,
  ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Scrollbar>
>(function ScrollBar({ className, orientation = 'vertical', ...props }, ref) {
  const isTouch = useContext(ScrollAreaContext);

  if (isTouch) return null;

  return (
    <ScrollAreaPrimitive.Scrollbar
      ref={ref}
      orientation={orientation}
      data-slot="scroll-area-scrollbar"
      className={cn(
        'group/scrollbar absolute z-20 flex touch-none select-none',
        'opacity-0 transition-opacity duration-120 ease-out delay-160',
        'data-[hovering]:duration-160 data-[scrolling]:duration-160',
        'data-[hovering]:opacity-100 data-[scrolling]:opacity-100',
        'data-[hovering]:delay-0 data-[scrolling]:delay-0',
        orientation === 'vertical' && 'top-0 right-0 h-full w-2.5',
        orientation === 'horizontal' && 'bottom-0 left-0 h-2.5 w-full flex-col',
        className,
      )}
      {...props}
    >
      <ScrollAreaPrimitive.Thumb
        data-slot="scroll-area-thumb"
        className={cn(
          'relative rounded-full bg-[color-mix(in_srgb,var(--foreground)_10%,transparent)]',
          'transition-[background-color,width,height] duration-160 ease-in-out',
          'group-hover/scrollbar:bg-[color-mix(in_srgb,var(--foreground)_16%,transparent)]',
          'active:!bg-[color-mix(in_srgb,var(--foreground)_22%,transparent)]',
          orientation === 'vertical' &&
            'mx-auto my-1 w-1 -translate-x-0.5 h-[var(--scroll-area-thumb-height)] group-hover/scrollbar:w-1.5',
          orientation === 'horizontal' &&
            'my-auto mx-1 h-1 -translate-y-0.5 w-[var(--scroll-area-thumb-width)] group-hover/scrollbar:h-1.5',
        )}
      />
    </ScrollAreaPrimitive.Scrollbar>
  );
});

ScrollBar.displayName = 'ScrollBar';

export { ScrollArea, ScrollBar };
