'use client';

import * as React from 'react';
import { CodeIcon, EyeIcon, RotateCcwIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface ComponentPreviewProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  /** Optional source shown in the Code tab */
  code?: string;
  /** Center content in a fixed min-height canvas (default true) */
  center?: boolean;
  /** Wider canvas for tables / portals */
  fullWidth?: boolean;
}

/**
 * Live preview shell for docs pages (Preview / Code tabs).
 * Pattern inspired by common component catalogs; implementation is BetterPay-specific.
 */
export function ComponentPreview({
  children,
  code,
  className,
  center = true,
  fullWidth = false,
  ...props
}: ComponentPreviewProps) {
  const [activeTab, setActiveTab] = React.useState<'preview' | 'code'>('preview');
  const [previewKey, setPreviewKey] = React.useState(0);
  const [spinning, setSpinning] = React.useState(false);

  const replay = () => {
    setSpinning(true);
    setPreviewKey((k) => k + 1);
    window.setTimeout(() => setSpinning(false), 400);
  };

  if (!code) {
    return (
      <div className={cn('not-prose my-8 w-full', className)} {...props}>
        <div className="mb-2 flex justify-end">
          <button
            type="button"
            onClick={replay}
            className="flex size-7 items-center justify-center rounded-md text-fd-muted-foreground transition-colors hover:bg-fd-muted hover:text-fd-foreground"
            aria-label="Replay preview"
            title="Replay"
          >
            <RotateCcwIcon className={cn('size-4', spinning && 'animate-spin')} />
          </button>
        </div>
        <div
          key={previewKey}
          className={cn(
            'bp-preview-surface w-full rounded-xl border border-fd-border p-6 md:p-10',
            center && 'flex min-h-[280px] items-center justify-center',
            fullWidth && 'block',
          )}
        >
          <div className={cn(fullWidth ? 'w-full' : 'w-full max-w-xl')}>{children}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('not-prose my-8 w-full', className)} {...props}>
      <div className="flex items-center rounded-t-xl border border-b-0 border-fd-border bg-fd-muted/40 px-1 pr-2">
        <button
          type="button"
          onClick={() => setActiveTab('preview')}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors',
            activeTab === 'preview'
              ? 'text-fd-foreground'
              : 'text-fd-muted-foreground hover:text-fd-foreground',
          )}
        >
          <EyeIcon className="size-4" />
          Preview
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('code')}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors',
            activeTab === 'code'
              ? 'text-fd-foreground'
              : 'text-fd-muted-foreground hover:text-fd-foreground',
          )}
        >
          <CodeIcon className="size-4" />
          Code
        </button>
        {activeTab === 'preview' ? (
          <button
            type="button"
            onClick={replay}
            className="ml-auto flex size-7 items-center justify-center rounded-md text-fd-muted-foreground transition-colors hover:bg-fd-muted hover:text-fd-foreground"
            aria-label="Replay preview"
          >
            <RotateCcwIcon className={cn('size-4', spinning && 'animate-spin')} />
          </button>
        ) : (
          <span className="ml-auto" />
        )}
      </div>

      <div className="overflow-hidden rounded-b-xl border border-fd-border">
        {activeTab === 'preview' ? (
          <div
            key={previewKey}
            className={cn(
              'bp-preview-surface w-full p-6 md:p-10',
              center && 'flex min-h-[300px] items-center justify-center',
            )}
          >
            <div className={cn(fullWidth ? 'w-full' : 'w-full max-w-xl')}>{children}</div>
          </div>
        ) : (
          <pre className="overflow-x-auto bg-fd-card p-4 text-[13px] leading-relaxed text-fd-foreground">
            <code>{code}</code>
          </pre>
        )}
      </div>
    </div>
  );
}
