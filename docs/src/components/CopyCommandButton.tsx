'use client';

import * as React from 'react';
import { CheckIcon, CopyIcon, TerminalIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface CopyCommandButtonProps {
  command: string;
  copyCommand?: string;
  className?: string;
  label?: string;
}

export function CopyCommandButton({
  command,
  copyCommand,
  className,
  label = 'Install',
}: CopyCommandButtonProps) {
  const [copied, setCopied] = React.useState(false);
  const value = copyCommand ?? command;

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // ignore
    }
  };

  return (
    <div
      className={cn(
        'not-prose mb-3 flex flex-col items-stretch justify-end gap-2 sm:flex-row sm:items-center',
        className,
      )}
    >
      <button
        type="button"
        onClick={onCopy}
        className={cn(
          'inline-flex items-center gap-2 rounded-lg border border-fd-border bg-fd-card px-3 py-2',
          'font-mono text-xs text-fd-foreground shadow-sm transition-colors',
          'hover:bg-fd-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring',
        )}
        aria-label={`${label}: ${command}`}
      >
        <TerminalIcon className="size-3.5 shrink-0 text-fd-muted-foreground" />
        <span className="max-w-[min(100%,28rem)] truncate">{command}</span>
        {copied ? (
          <CheckIcon className="size-3.5 shrink-0 text-green-600" />
        ) : (
          <CopyIcon className="size-3.5 shrink-0 text-fd-muted-foreground" />
        )}
      </button>
    </div>
  );
}
