'use client';

import * as React from 'react';
import {
  CodeIcon,
  ExternalLinkIcon,
  EyeIcon,
  Maximize2Icon,
  MonitorIcon,
  RotateCcwIcon,
  SmartphoneIcon,
  TabletIcon,
} from 'lucide-react';
import { DynamicCodeBlock } from 'fumadocs-ui/components/dynamic-codeblock';
import { cn } from '@/lib/cn';
import { ThemeToggle } from '@/components/ThemeToggle';

type Viewport = 'mobile' | 'tablet' | 'desktop' | 'full';

const VIEWPORTS: {
  id: Viewport;
  label: string;
  width: string;
  icon: React.ReactNode;
}[] = [
  { id: 'mobile', label: 'Mobile', width: '375px', icon: <SmartphoneIcon className="size-4" /> },
  { id: 'tablet', label: 'Tablet', width: '768px', icon: <TabletIcon className="size-4" /> },
  { id: 'desktop', label: 'Desktop', width: '100%', icon: <MonitorIcon className="size-4" /> },
  { id: 'full', label: 'Full', width: '100%', icon: <Maximize2Icon className="size-4" /> },
];

export interface ComponentPreviewProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  title?: string;
  name?: string;
  code?: string;
  lang?: string;
  /**
   * Align content in the canvas.
   * Default `start` (left).
   */
  align?: 'start' | 'center';
  /** @deprecated Use `align="center"` */
  center?: boolean;
  /** Default to full-width content (no max-w) */
  fullWidth?: boolean;
  /** Default viewport */
  defaultViewport?: Viewport;
  /** Hide responsive controls */
  hideViewport?: boolean;
}

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
  defaultViewport = 'desktop',
  hideViewport = false,
  ...props
}: ComponentPreviewProps) {
  const [activeTab, setActiveTab] = React.useState<'preview' | 'code'>('preview');
  const [previewKey, setPreviewKey] = React.useState(0);
  const [spinning, setSpinning] = React.useState(false);
  const [previewTheme, setPreviewTheme] = React.useState<'light' | 'dark'>('light');
  const [viewport, setViewport] = React.useState<Viewport>(defaultViewport);
  const [openPreview, setOpenPreview] = React.useState(false);

  const contentAlign = align ?? (center ? 'center' : 'start');
  const vp = VIEWPORTS.find((v) => v.id === viewport) ?? VIEWPORTS[2];
  const isFull = viewport === 'full' || fullWidth;

  const replay = () => {
    setSpinning(true);
    setPreviewKey((k) => k + 1);
    window.setTimeout(() => setSpinning(false), 400);
  };

  // Escape closes open preview
  React.useEffect(() => {
    if (!openPreview) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenPreview(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openPreview]);

  const canvas = (
    <div
      key={previewKey}
      data-preview-theme={previewTheme}
      className={cn(
        'bp-preview-surface w-full transition-[max-width] duration-200',
        previewTheme === 'dark' && 'dark',
        openPreview ? 'min-h-[70vh] p-8 md:p-12' : 'min-h-[300px] p-6 md:p-8',
        contentAlign === 'center'
          ? 'flex items-center justify-center'
          : 'flex items-start justify-start',
      )}
      style={
        openPreview || viewport === 'desktop' || viewport === 'full'
          ? undefined
          : { maxWidth: vp.width, marginInline: contentAlign === 'center' ? 'auto' : undefined }
      }
    >
      <div
        className={cn(
          isFull ? 'w-full' : 'w-full max-w-xl',
          contentAlign === 'start' && 'mr-auto',
          (viewport === 'mobile' || viewport === 'tablet' || viewport === 'full') && 'max-w-none',
        )}
        style={
          !openPreview && (viewport === 'mobile' || viewport === 'tablet')
            ? { width: '100%' }
            : undefined
        }
      >
        {children}
      </div>
    </div>
  );

  const toolbar = (
    <div className="flex flex-wrap items-center gap-1 border-b border-fd-border bg-fd-muted/40 px-1 pr-2">
      <button
        type="button"
        onClick={() => setActiveTab('preview')}
        className={cn(
          'flex items-center gap-2 px-3 py-2.5 text-sm font-medium transition-colors',
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
            'flex items-center gap-2 px-3 py-2.5 text-sm font-medium transition-colors',
            activeTab === 'code'
              ? 'border-b-2 border-fd-primary text-fd-foreground'
              : 'text-fd-muted-foreground hover:text-fd-foreground',
          )}
        >
          <CodeIcon className="size-4" />
          Code
        </button>
      ) : null}

      {!hideViewport && activeTab === 'preview' ? (
        <div className="ml-1 hidden items-center gap-0.5 rounded-lg border border-fd-border bg-fd-card p-0.5 sm:flex">
          {VIEWPORTS.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setViewport(v.id)}
              className={cn(
                'flex size-8 items-center justify-center rounded-md transition-colors',
                viewport === v.id
                  ? 'bg-fd-muted text-fd-foreground'
                  : 'text-fd-muted-foreground hover:text-fd-foreground',
              )}
              aria-label={v.label}
              title={v.label}
            >
              {v.icon}
            </button>
          ))}
        </div>
      ) : null}

      <div className="ml-auto flex items-center gap-1.5">
        <ThemeToggle theme={previewTheme} onThemeChange={setPreviewTheme} />
        <button
          type="button"
          onClick={() => setOpenPreview(true)}
          className="flex size-9 items-center justify-center rounded-lg border border-fd-border bg-fd-card text-fd-muted-foreground shadow-sm transition-colors hover:bg-fd-muted/60 hover:text-fd-foreground"
          aria-label="Open full preview"
          title="Open preview"
        >
          <ExternalLinkIcon className="size-4" />
        </button>
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
  );

  return (
    <div className={cn('not-prose my-6 w-full', className)} data-component={name} {...props}>
      {title ? (
        <p className="mb-2 text-sm font-medium text-fd-muted-foreground">{title}</p>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-fd-border bg-fd-card shadow-sm">
        {toolbar}

        {activeTab === 'preview' || !code ? (
          <div
            className={cn(
              'overflow-x-auto',
              viewport !== 'desktop' && viewport !== 'full' && 'bg-fd-muted/20',
            )}
          >
            {viewport === 'mobile' || viewport === 'tablet' ? (
              <div className="flex justify-start p-4 md:p-6">
                <div
                  className="overflow-hidden rounded-lg border border-fd-border shadow-sm"
                  style={{ width: vp.width, maxWidth: '100%' }}
                >
                  {canvas}
                </div>
              </div>
            ) : (
              canvas
            )}
          </div>
        ) : (
          <div className="[&_figure]:my-0 [&_figure]:rounded-none [&_figure]:border-0">
            <DynamicCodeBlock lang={lang} code={code} />
          </div>
        )}
      </div>

      {/* Full-screen open preview (scoped theme) */}
      {openPreview ? (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/50 p-3 backdrop-blur-sm sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label="Component preview"
          onClick={() => setOpenPreview(false)}
        >
          <div
            className="mx-auto flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-fd-border bg-fd-card shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b border-fd-border bg-fd-muted/40 px-3 py-2">
              <span className="text-sm font-medium text-fd-foreground">
                {title || name || 'Preview'}
              </span>
              <div className="ml-auto flex items-center gap-1.5">
                <div className="hidden items-center gap-0.5 rounded-lg border border-fd-border bg-fd-card p-0.5 sm:flex">
                  {VIEWPORTS.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setViewport(v.id)}
                      className={cn(
                        'flex size-8 items-center justify-center rounded-md transition-colors',
                        viewport === v.id
                          ? 'bg-fd-muted text-fd-foreground'
                          : 'text-fd-muted-foreground hover:text-fd-foreground',
                      )}
                      aria-label={v.label}
                      title={v.label}
                    >
                      {v.icon}
                    </button>
                  ))}
                </div>
                <ThemeToggle theme={previewTheme} onThemeChange={setPreviewTheme} />
                <button
                  type="button"
                  onClick={() => setOpenPreview(false)}
                  className="rounded-lg border border-fd-border bg-fd-card px-3 py-1.5 text-xs font-medium text-fd-foreground hover:bg-fd-muted/60"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-auto">{canvas}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
