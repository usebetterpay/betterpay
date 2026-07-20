'use client';

import * as React from 'react';
import { CheckIcon, CopyIcon, TerminalIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

const REGISTRY_NS = '@betterpay';

export interface CopyCommandButtonProps {
  command?: string;
  copyCommand?: string;
  registryName?: string;
  className?: string;
  label?: string;
}

/**
 * Install / copy command — left-aligned, flat (no heavy shadow).
 */
export function CopyCommandButton({
  command,
  copyCommand,
  registryName,
  className,
  label = 'Install',
}: CopyCommandButtonProps) {
  const [copied, setCopied] = React.useState(false);

  const nsCmd = registryName
    ? `npx shadcn@latest add ${REGISTRY_NS}/${registryName}`
    : null;

  const display =
    command || nsCmd || 'pnpm add @betterpay/ui';

  const value = copyCommand || display;

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
        'not-prose mb-3 flex w-full flex-row items-center justify-start',
        className,
      )}
    >
      <button
        type="button"
        onClick={onCopy}
        className={cn(
          'flex w-full min-w-0 items-center justify-start gap-2 rounded-md border border-fd-border bg-fd-secondary/40 px-3 py-2.5 text-left',
          'font-mono text-xs text-fd-foreground transition-colors',
          'hover:bg-fd-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring',
          'shadow-none ring-0',
        )}
        aria-label={`${label}: ${display}`}
        title={display}
      >
        <TerminalIcon className="size-3.5 shrink-0 text-fd-muted-foreground" />
        <span className="min-w-0 flex-1 truncate text-left">{display}</span>
        {copied ? (
          <CheckIcon className="size-3.5 shrink-0 text-green-600 dark:text-green-400" />
        ) : (
          <CopyIcon className="size-3.5 shrink-0 text-fd-muted-foreground" />
        )}
      </button>
    </div>
  );
}
