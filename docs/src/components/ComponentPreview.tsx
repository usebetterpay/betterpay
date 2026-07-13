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
      className={cn(
        'inline-flex size-8 items-center justify-center rounded-md transition-colors',
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
        openPreview ? 'min-h-[70vh] p-6 md:p-10' : 'min-h-[280px] p-5 md:p-6',
        contentAlign === 'center'
          ? 'flex items-center justify-center'
          : 'flex items-start justify-start',
      )}
    >
      <div
        className={cn(
          isFull ? 'w-full' : 'w-full max-w-xl',
          contentAlign === 'start' && 'mr-auto',
          (viewport === 'mobile' || viewport === 'tablet' || viewport === 'full') && 'max-w-none',
        )}
      >
        {children}
      </div>
    </div>
  );

  const viewportControls = !hideViewport ? (
    <div
      className="flex items-center gap-0.5 rounded-md border border-fd-border bg-fd-background p-0.5"
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

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2 border-b border-fd-border bg-fd-muted/30 px-2 py-1.5">
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => setActiveTab('preview')}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors',
            activeTab === 'preview'
              ? 'bg-fd-background text-fd-foreground shadow-none ring-1 ring-fd-border'
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
              'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors',
              activeTab === 'code'
                ? 'bg-fd-background text-fd-foreground shadow-none ring-1 ring-fd-border'
                : 'text-fd-muted-foreground hover:text-fd-foreground',
            )}
          >
            <CodeIcon className="size-4" />
            Code
          </button>
        ) : null}
      </div>

      {activeTab === 'preview' ? (
        <div className="flex flex-wrap items-center gap-1.5">{viewportControls}</div>
      ) : null}

      <div className="ml-auto flex shrink-0 items-center gap-1">
        <ThemeToggle theme={previewTheme} onThemeChange={setPreviewTheme} />
        <ToolbarButton
          onClick={() => setOpenPreview(true)}
          label="Open full preview"
          className="size-8 rounded-md border border-fd-border bg-fd-background shadow-none"
        >
          <ExternalLinkIcon className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={replay}
          label="Replay"
          className="size-8 rounded-md border border-fd-border bg-fd-background shadow-none"
        >
          <RotateCcwIcon className={cn('size-4', spinning && 'animate-spin')} />
        </ToolbarButton>
      </div>
    </div>
  );

  return (
    <div className={cn('not-prose my-6 w-full', className)} data-component={name} {...props}>
      {title ? (
        <p className="mb-2 text-left text-sm font-medium text-fd-muted-foreground">{title}</p>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-fd-border bg-fd-card">
        {toolbar}

        {activeTab === 'preview' || !code ? (
          <div
            className={cn(
              'overflow-x-auto',
              (viewport === 'mobile' || viewport === 'tablet') && 'bg-fd-muted/15',
            )}
          >
            {viewport === 'mobile' || viewport === 'tablet' ? (
              <div className="flex justify-start p-4 md:p-5">
                <div
                  className="w-full overflow-hidden rounded-lg border border-fd-border"
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

      {openPreview ? (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/50 p-3 backdrop-blur-sm sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label="Component preview"
          onClick={() => setOpenPreview(false)}
        >
          <div
            className="mx-auto flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-fd-border bg-fd-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-wrap items-center gap-2 border-b border-fd-border bg-fd-muted/30 px-3 py-2">
              <span className="text-sm font-medium text-fd-foreground">
                {title || name || 'Preview'}
              </span>
              <div className="ml-auto flex flex-wrap items-center gap-1.5">
                {viewportControls}
                <ThemeToggle theme={previewTheme} onThemeChange={setPreviewTheme} />
                <button
                  type="button"
                  onClick={() => setOpenPreview(false)}
                  className="rounded-md border border-fd-border bg-fd-background px-3 py-1.5 text-xs font-medium text-fd-foreground hover:bg-fd-muted/60"
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
