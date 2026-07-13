'use client';

import * as React from 'react';
import { Button } from '../primitives/button';
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPopup,
  DialogTitle,
  DialogTrigger,
} from '../primitives/dialog';

const DEFAULT_REASONS = [
  { id: 'too_expensive', label: 'Too expensive' },
  { id: 'missing_features', label: 'Missing features' },
  { id: 'switching', label: 'Switching provider' },
  { id: 'temporary', label: 'Temporary pause' },
  { id: 'other', label: 'Other' },
] as const;

export interface CancelFlowProps {
  planName?: string;
  triggerLabel?: string;
  title?: string;
  description?: string;
  reasons?: ReadonlyArray<{ id: string; label: string }>;
  onConfirm?: (payload: { reasonId?: string }) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

export function CancelFlow({
  planName,
  triggerLabel = 'Cancel subscription',
  title = 'Cancel subscription?',
  description,
  reasons = DEFAULT_REASONS,
  onConfirm,
  open,
  onOpenChange,
  className,
}: CancelFlowProps) {
  const [reasonId, setReasonId] = React.useState<string | undefined>();
  const [internalOpen, setInternalOpen] = React.useState(false);
  const isOpen = open ?? internalOpen;

  const handleOpenChange = (next: boolean) => {
    if (open === undefined) setInternalOpen(next);
    onOpenChange?.(next);
    if (!next) setReasonId(undefined);
  };

  const body =
    description ??
    (planName
      ? `You are about to cancel ${planName}. Access typically continues until the end of the current period.`
      : 'You are about to cancel this subscription. Access typically continues until the end of the current period.');

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger
        data-slot="cancel-flow-trigger"
        render={<Button variant="outline" className={className} />}
      >
        {triggerLabel}
      </DialogTrigger>
      <DialogPopup className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{body}</DialogDescription>
        </DialogHeader>
        <fieldset data-slot="cancel-flow-reasons" className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium">Why are you leaving? (optional)</legend>
          {reasons.map((reason) => (
            <label
              key={reason.id}
              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-border px-3 py-2.5 text-sm transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5"
            >
              <input
                type="radio"
                name="cancel-reason"
                value={reason.id}
                checked={reasonId === reason.id}
                onChange={() => setReasonId(reason.id)}
                className="size-4 shrink-0 accent-primary"
              />
              <span className="min-w-0 flex-1 leading-snug">{reason.label}</span>
            </label>
          ))}
        </fieldset>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Keep subscription
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              onConfirm?.({ reasonId });
              handleOpenChange(false);
            }}
          >
            Confirm cancel
          </Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}
