'use client';

import * as React from 'react';
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { XIcon } from 'lucide-react';
import { cn } from '../lib/cn';
import { Button } from './button';

/**
 * Modal surface (Base UI). Prefer inline flows when possible;
 * dialogs for confirmations and multi-step plan changes.
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
        'fixed inset-0 z-50 bg-[oklch(0.22_0.03_240/0.36)]',
        'transition-opacity duration-[var(--duration,180ms)] ease-[var(--ease-out,cubic-bezier(0.16,1,0.3,1))]',
        'data-[ending-style]:opacity-0 data-[starting-style]:opacity-0',
        className,
      )}
      {...props}
    />
  );
}

const DialogBackdrop = DialogOverlay;

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
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        className={cn(
          'fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2',
          'gap-4 rounded-lg bg-popover p-5 text-sm text-popover-foreground shadow-md outline-none',
          'ring-1 ring-border sm:max-w-lg',
          'transition-[opacity,transform] duration-[var(--duration,180ms)] ease-[var(--ease-out,cubic-bezier(0.16,1,0.3,1))]',
          'data-[ending-style]:scale-[0.98] data-[ending-style]:opacity-0',
          'data-[starting-style]:scale-[0.98] data-[starting-style]:opacity-0',
          className,
        )}
        {...props}
      >
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
    </DialogPortal>
  );
}

const DialogPopup = DialogContent;

function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-header"
      className={cn('flex flex-col gap-1.5 pr-8', className)}
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
        'flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end',
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
  DialogContent,
  DialogPopup,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
