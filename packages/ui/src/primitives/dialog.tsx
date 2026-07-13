'use client';

import * as React from 'react';
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { XIcon } from 'lucide-react';
import { cn } from '../lib/cn';
import { Button } from './button';

/**
 * Modal surface (Base UI).
 *
 * Mobile: bottom sheet (coss-style) for thumb reach + max height scroll.
 * Desktop: centered popup.
 * Triggers: <DialogTrigger render={<Button />}>
 */

function Dialog({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({ className, ...props }: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn(
        'fixed inset-0 z-50 bg-[oklch(0.22_0.03_240/0.4)] backdrop-blur-[2px]',
        'transition-opacity duration-[var(--duration,180ms)] ease-[var(--ease-out,cubic-bezier(0.16,1,0.3,1))]',
        'data-[ending-style]:opacity-0 data-[starting-style]:opacity-0',
        className,
      )}
      {...props}
    />
  );
}

const DialogBackdrop = DialogOverlay;

function DialogViewport({ className, ...props }: DialogPrimitive.Viewport.Props) {
  return (
    <DialogPrimitive.Viewport
      data-slot="dialog-viewport"
      className={cn(
        // Mobile: bottom-aligned sheet. Desktop: centered.
        'fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4',
        className,
      )}
      {...props}
    />
  );
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: DialogPrimitive.Popup.Props & {
  showCloseButton?: boolean;
}) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogViewport>
        <DialogPrimitive.Popup
          data-slot="dialog-content"
          className={cn(
            'relative flex max-h-[min(92dvh,40rem)] w-full min-w-0 flex-col',
            'gap-4 overflow-y-auto bg-popover p-5 text-sm text-popover-foreground outline-none',
            'ring-1 ring-border shadow-none',
            // Mobile bottom sheet
            'rounded-t-xl border-t border-border',
            'max-sm:data-[starting-style]:translate-y-4 max-sm:data-[ending-style]:translate-y-4',
            // Desktop centered card
            'sm:max-h-[min(90dvh,40rem)] sm:max-w-lg sm:rounded-xl sm:border',
            'sm:data-[starting-style]:scale-[0.98] sm:data-[ending-style]:scale-[0.98]',
            'transition-[opacity,transform] duration-[var(--duration,180ms)] ease-[var(--ease-out,cubic-bezier(0.16,1,0.3,1))]',
            'data-[ending-style]:opacity-0 data-[starting-style]:opacity-0',
            className,
          )}
          {...props}
        >
          {/* Grab handle — mobile only */}
          <div
            className="mx-auto mb-1 h-1 w-10 shrink-0 rounded-full bg-border sm:hidden"
            aria-hidden
          />
          {children}
          {showCloseButton ? (
            <DialogPrimitive.Close
              data-slot="dialog-close"
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
                  aria-label="Close"
                />
              }
            >
              <XIcon />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          ) : null}
        </DialogPrimitive.Popup>
      </DialogViewport>
    </DialogPortal>
  );
}

const DialogPopup = DialogContent;

function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-header"
      className={cn('flex flex-col gap-1.5 pr-8 text-left', className)}
      {...props}
    />
  );
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<'div'> & {
  showCloseButton?: boolean;
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        // Full-width stacked on mobile; row on sm+
        'flex flex-col-reverse gap-2 border-t border-border pt-4',
        'sm:flex-row sm:justify-end',
        '[&_[data-slot=button]]:w-full sm:[&_[data-slot=button]]:w-auto',
        className,
      )}
      {...props}
    >
      {children}
      {showCloseButton ? (
        <DialogPrimitive.Close render={<Button variant="outline" size="sm" />}>
          Close
        </DialogPrimitive.Close>
      ) : null}
    </div>
  );
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn('text-base font-semibold tracking-tight', className)}
      {...props}
    />
  );
}

function DialogDescription({ className, ...props }: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn('text-sm leading-relaxed text-muted-foreground', className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogTrigger,
  DialogPortal,
  DialogClose,
  DialogOverlay,
  DialogBackdrop,
  DialogViewport,
  DialogContent,
  DialogPopup,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
