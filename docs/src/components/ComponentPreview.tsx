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
  XIcon,
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
  { id: 'full', label: 'Full width', width: '100%', icon: <Maximize2Icon className="size-4" /> },
];

export interface ComponentPreviewProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  title?: string;
  name?: string;
  code?: string;
  lang?: string;
  align?: 'start' | 'center';
  /** @deprecated Use `align="center"` */
  center?: boolean;
  fullWidth?: boolean;
  defaultViewport?: Viewport;
  hideViewport?: boolean;
}

function ToolbarButton({
  active,
  onClick,
  label,
  children,
  className,
}: {
  active?: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={cn(
        'inline-flex size-8 items-center justify-center rounded-md transition-colors shadow-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring',
        active
          ? 'bg-fd-muted text-fd-foreground'
          : 'text-fd-muted-foreground hover:bg-fd-muted/60 hover:text-fd-foreground',
        className,
      )}
    >
      {children}
    </button>
  );
}

function PreviewCanvas({
  children,
  previewTheme,
  contentAlign,
  viewport,
  fullWidth,
  openPreview,
  previewKey,
}: {
  children: React.ReactNode;
  previewTheme: 'light' | 'dark';
  contentAlign: 'start' | 'center';
  viewport: Viewport;
  fullWidth: boolean;
  openPreview: boolean;
  previewKey: number;
}) {
  const isDevice = viewport === 'mobile' || viewport === 'tablet';
  const isFull = viewport === 'full' || fullWidth;
  const vp = VIEWPORTS.find((v) => v.id === viewport) ?? VIEWPORTS[2];

  const surface = (
    <div
      key={previewKey}
      data-preview-theme={previewTheme}
      data-viewport={viewport}
      className={cn(
        'bp-preview-surface w-full',
        previewTheme === 'dark' && 'dark',
        openPreview ? 'min-h-[min(70vh,640px)] p-6 md:p-10' : 'min-h-[280px] p-5 md:p-6',
        contentAlign === 'center'
          ? 'flex items-center justify-center'
          : 'flex items-start justify-start',
      )}
    >
      <div
        className={cn(
          'w-full',
          // Desktop caps content; full / fullWidth stretch edge-to-edge
          viewport === 'desktop' && !fullWidth && !openPreview && 'max-w-xl',
          (isFull || openPreview || isDevice) && 'max-w-none',
          contentAlign === 'start' && 'mr-auto',
        )}
      >
        {children}
      </div>
    </div>
  );

  if (isDevice) {
    return (
      <div
        className={cn(
          'overflow-x-auto bg-fd-muted/15',
          openPreview ? 'flex min-h-0 flex-1 justify-start p-4 md:p-6' : 'flex justify-start p-4 md:p-5',
        )}
      >
        <div
          className="shrink-0 overflow-hidden rounded-lg border border-fd-border bg-fd-card shadow-none"
          style={{ width: vp.width, maxWidth: '100%' }}
        >
          {surface}
        </div>
      </div>
    );
  }

  return (
    <div className={cn(openPreview && 'min-h-0 flex-1 overflow-auto', !openPreview && 'overflow-x-auto')}>
      {surface}
    </div>
  );
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
  const [viewport, setViewport] = React.useState<Viewport>(
    fullWidth && defaultViewport === 'desktop' ? 'full' : defaultViewport,
  );
  const [openPreview, setOpenPreview] = React.useState(false);

  const contentAlign = align ?? (center ? 'center' : 'start');

  const replay = () => {
    setSpinning(true);
    setPreviewKey((k) => k + 1);
    window.setTimeout(() => setSpinning(false), 400);
  };

  React.useEffect(() => {
    if (!openPreview) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenPreview(false);
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [openPreview]);

  const viewportControls = !hideViewport ? (
    <div
      className="flex shrink-0 items-center gap-0.5 rounded-md border border-fd-border bg-fd-background p-0.5"
      role="group"
      aria-label="Preview width"
    >
      {VIEWPORTS.map((v) => (
        <ToolbarButton
          key={v.id}
          active={viewport === v.id}
          onClick={() => setViewport(v.id)}
          label={v.label}
        >
          {v.icon}
        </ToolbarButton>
      ))}
    </div>
  ) : null;

  const stage = (
    <PreviewCanvas
      previewTheme={previewTheme}
      contentAlign={contentAlign}
      viewport={viewport}
      fullWidth={fullWidth}
      openPreview={openPreview}
      previewKey={previewKey}
    >
      {children}
    </PreviewCanvas>
  );

  return (
    <div className={cn('not-prose my-6 w-full', className)} data-component={name} {...props}>
      {title ? (
        <p className="mb-2 text-left text-sm font-medium text-fd-muted-foreground">{title}</p>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-fd-border bg-fd-card">
        {/* Left cluster (tabs + viewport) | right actions — never center the viewport group */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-fd-border bg-fd-muted/30 px-2 py-1.5">
          <div className="flex min-w-0 flex-wrap items-center justify-start gap-2">
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors shadow-none',
                  activeTab === 'preview'
                    ? 'bg-fd-background text-fd-foreground ring-1 ring-fd-border'
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
                    'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors shadow-none',
                    activeTab === 'code'
                      ? 'bg-fd-background text-fd-foreground ring-1 ring-fd-border'
                      : 'text-fd-muted-foreground hover:text-fd-foreground',
                  )}
                >
                  <CodeIcon className="size-4" />
                  Code
                </button>
              ) : null}
            </div>

            {activeTab === 'preview' ? viewportControls : null}
          </div>

          <div className="flex shrink-0 items-center justify-end gap-1">
            <ThemeToggle theme={previewTheme} onThemeChange={setPreviewTheme} />
            <ToolbarButton
              onClick={() => setOpenPreview(true)}
              label="Open full preview"
              className="size-8 rounded-md border border-fd-border bg-fd-background"
            >
              <ExternalLinkIcon className="size-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={replay}
              label="Replay"
              className="size-8 rounded-md border border-fd-border bg-fd-background"
            >
              <RotateCcwIcon className={cn('size-4', spinning && 'animate-spin')} />
            </ToolbarButton>
          </div>
        </div>

        {activeTab === 'preview' || !code ? (
          stage
        ) : (
          <div className="[&_figure]:my-0 [&_figure]:rounded-none [&_figure]:border-0">
            <DynamicCodeBlock lang={lang} code={code} />
          </div>
        )}
      </div>

      {openPreview ? (
        <div
          className="fixed inset-0 z-[200] flex flex-col bg-black/50 p-3 backdrop-blur-sm sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label="Component preview"
          onClick={() => setOpenPreview(false)}
        >
          <div
            className="mx-auto flex h-full w-full max-w-[min(100%,96rem)] flex-col overflow-hidden rounded-xl border border-fd-border bg-fd-card shadow-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-fd-border bg-fd-muted/30 px-3 py-2">
              <div className="flex min-w-0 flex-wrap items-center justify-start gap-2">
                <span className="text-sm font-medium text-fd-foreground">
                  {title || name || 'Preview'}
                </span>
                {viewportControls}
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <ThemeToggle theme={previewTheme} onThemeChange={setPreviewTheme} />
                <button
                  type="button"
                  onClick={() => setOpenPreview(false)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-fd-border bg-fd-background px-3 py-1.5 text-xs font-medium text-fd-foreground shadow-none hover:bg-fd-muted/60"
                >
                  <XIcon className="size-3.5" />
                  Close
                </button>
              </div>
            </div>
            {stage}
          </div>
        </div>
      ) : null}
    </div>
  );
}
