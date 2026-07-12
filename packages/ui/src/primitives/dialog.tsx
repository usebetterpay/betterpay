'use client';

import * as React from 'react';
import { Dialog as BaseDialog } from '@base-ui/react/dialog';
import { XIcon } from 'lucide-react';
import { cn } from '../lib/cn';
import { Button } from './button';

export const Dialog = BaseDialog.Root;
export const DialogPortal = BaseDialog.Portal;
export const DialogClose = BaseDialog.Close;

export function DialogTrigger({
  className,
  ...props
}: React.ComponentProps<typeof BaseDialog.Trigger>) {
  return (
    <BaseDialog.Trigger data-slot="dialog-trigger" className={cn(className)} {...props} />
  );
}

export function DialogBackdrop({
  className,
  ...props
}: React.ComponentProps<typeof BaseDialog.Backdrop>) {
  return (
    <BaseDialog.Backdrop
      data-slot="dialog-backdrop"
      className={cn(
        'fixed inset-0 z-50 bg-black/50 transition-opacity data-[ending-style]:opacity-0 data-[starting-style]:opacity-0',
        className,
      )}
      {...props}
    />
  );
}

export function DialogPopup({
  className,
  children,
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof BaseDialog.Popup> & { showCloseButton?: boolean }) {
  return (
    <DialogPortal>
      <DialogBackdrop />
      <BaseDialog.Popup
        data-slot="dialog-popup"
        className={cn(
          'fixed top-1/2 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-md border border-[var(--bp-border,#e2e8f0)] bg-[var(--bp-card,#fff)] p-5 text-[var(--bp-card-foreground,#111)] shadow-lg outline-none transition-all',
          'data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0',
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton ? (
          <BaseDialog.Close
            data-slot="dialog-close"
            render={
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-3 right-3 size-8 opacity-70 hover:opacity-100"
                aria-label="Close"
              />
            }
            nativeButton
          >
            <XIcon className="size-4" />
          </BaseDialog.Close>
        ) : null}
      </BaseDialog.Popup>
    </DialogPortal>
  );
}

export function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof BaseDialog.Title>) {
  return (
    <BaseDialog.Title
      data-slot="dialog-title"
      className={cn('text-lg font-semibold leading-none tracking-tight', className)}
      {...props}
    />
  );
}

export function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof BaseDialog.Description>) {
  return (
    <BaseDialog.Description
      data-slot="dialog-description"
      className={cn('text-sm text-[var(--bp-muted-foreground,#64748b)]', className)}
      {...props}
    />
  );
}

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div data-slot="dialog-header" className={cn('flex flex-col gap-1.5 pr-8', className)} {...props} />
  );
}

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)}
      {...props}
    />
  );
}
