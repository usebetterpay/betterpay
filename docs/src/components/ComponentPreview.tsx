'use client';

import * as React from 'react';
import { CodeIcon, EyeIcon, RotateCcwIcon } from 'lucide-react';
import { DynamicCodeBlock } from 'fumadocs-ui/components/dynamic-codeblock';
import { cn } from '@/lib/cn';
import { ThemeToggle } from '@/components/ThemeToggle';

export interface ComponentPreviewProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  /** Optional title shown above the preview chrome */
  title?: string;
  /** Registry / component name for docs metadata */
  name?: string;
  /** Source shown in the Code tab (highlighted) */
  code?: string;
  /** Language for the code tab */
  lang?: string;
  /**
   * Align content in the canvas.
   * Default `start` (left) — product docs should not center cards.
   */
  align?: 'start' | 'center';
  /** @deprecated Use `align="center"` — kept for older MDX */
  center?: boolean;
  /** Wider canvas for tables / portals */
  fullWidth?: boolean;
}

/**
 * Live preview shell. Theme toggle only affects the canvas (scoped `.dark`), not the docs page.
 */
export function ComponentPreview({
  children,
  title,
  name,
  code,
  lang = 'tsx',
  className,
  align,
  center,
  fullWidth = false,
  ...props
}: ComponentPreviewProps) {
  const [activeTab, setActiveTab] = React.useState<'preview' | 'code'>('preview');
  const [previewKey, setPreviewKey] = React.useState(0);
  const [spinning, setSpinning] = React.useState(false);
  const [previewTheme, setPreviewTheme] = React.useState<'light' | 'dark'>('light');

  const contentAlign = align ?? (center ? 'center' : 'start');

  const replay = () => {
    setSpinning(true);
    setPreviewKey((k) => k + 1);
    window.setTimeout(() => setSpinning(false), 400);
  };

  return (
    <div
      className={cn('not-prose my-6 w-full', className)}
      data-component={name}
      {...props}
    >
      {title ? (
        <p className="mb-2 text-sm font-medium text-fd-muted-foreground">{title}</p>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-fd-border bg-fd-card shadow-sm">
        <div className="flex items-center gap-1 border-b border-fd-border bg-fd-muted/40 px-1 pr-2">
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors',
              activeTab === 'preview'
                ? 'border-b-2 border-fd-primary text-fd-foreground'
                : 'text-fd-muted-foreground hover:text-fd-foreground',
            )}
          >
            <EyeIcon className="size-4" />
            Preview
          </button>
          {code ? (
            <button
              type="button"
              onClick={() => setActiveTab('code')}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors',
                activeTab === 'code'
                  ? 'border-b-2 border-fd-primary text-fd-foreground'
                  : 'text-fd-muted-foreground hover:text-fd-foreground',
              )}
            >
              <CodeIcon className="size-4" />
              Code
            </button>
          ) : null}

          <div className="ml-auto flex items-center gap-1.5">
            <ThemeToggle theme={previewTheme} onThemeChange={setPreviewTheme} />
            <button
              type="button"
              onClick={replay}
              className="flex size-9 items-center justify-center rounded-lg border border-fd-border bg-fd-card text-fd-muted-foreground shadow-sm transition-colors hover:bg-fd-muted/60 hover:text-fd-foreground"
              aria-label="Replay preview"
              title="Replay"
            >
              <RotateCcwIcon className={cn('size-4', spinning && 'animate-spin')} />
            </button>
          </div>
        </div>

        {activeTab === 'preview' || !code ? (
          <div
            key={previewKey}
            data-preview-theme={previewTheme}
            className={cn(
              'bp-preview-surface w-full p-6 md:p-8',
              previewTheme === 'dark' && 'dark',
              contentAlign === 'center'
                ? 'flex min-h-[300px] items-center justify-center'
                : 'flex min-h-[300px] items-start justify-start',
            )}
          >
            <div
              className={cn(
                fullWidth ? 'w-full' : 'w-full max-w-xl',
                contentAlign === 'start' && 'mr-auto',
              )}
            >
              {children}
            </div>
          </div>
        ) : (
          <div className="[&_figure]:my-0 [&_figure]:rounded-none [&_figure]:border-0">
            <DynamicCodeBlock lang={lang} code={code} />
          </div>
        )}
      </div>
    </div>
  );
}
