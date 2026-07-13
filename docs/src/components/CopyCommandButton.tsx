'use client';

import * as React from 'react';
import { CheckIcon, CopyIcon, TerminalIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

const REGISTRY_BASE =
  process.env.NEXT_PUBLIC_BETTERPAY_REGISTRY_URL || 'https://betterpay-docs.pages.dev/r';

export interface CopyCommandButtonProps {
  /** Displayed command (defaults to pnpm add package) */
  command?: string;
  copyCommand?: string;
  /** Registry component name → builds `npx shadcn@latest add <url>` */
  registryName?: string;
  className?: string;
  label?: string;
}

/**
 * Install / copy command.
 * Prefer `registryName` for shadcn-style install when registry is available.
 */
export function CopyCommandButton({
  command,
  copyCommand,
  registryName,
  className,
  label = 'Install',
}: CopyCommandButtonProps) {
  const [copied, setCopied] = React.useState(false);

  const display =
    command ||
    (registryName
      ? `npx shadcn@latest add ${REGISTRY_BASE}/${registryName}.json`
      : 'pnpm add @betterpay/ui');

  const value =
    copyCommand ||
    (registryName
      ? `npx shadcn@latest add ${REGISTRY_BASE}/${registryName}.json`
      : display);

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
        'not-prose mb-3 flex flex-row flex-wrap items-center justify-end gap-2',
        className,
      )}
    >
      <button
        type="button"
        onClick={onCopy}
        className={cn(
          'inline-flex min-w-0 max-w-full items-center gap-2 rounded-lg border border-fd-border bg-fd-card px-3 py-2',
          'font-mono text-xs text-fd-foreground shadow-sm transition-colors',
          'hover:bg-fd-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring',
        )}
        aria-label={`${label}: ${display}`}
        title={display}
      >
        <TerminalIcon className="size-3.5 shrink-0 text-fd-muted-foreground" />
        <span className="truncate">{display}</span>
        {copied ? (
          <CheckIcon className="size-3.5 shrink-0 text-green-600 dark:text-green-400" />
        ) : (
          <CopyIcon className="size-3.5 shrink-0 text-fd-muted-foreground" />
        )}
      </button>
    </div>
  );
}
