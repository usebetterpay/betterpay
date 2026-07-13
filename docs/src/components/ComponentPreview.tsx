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
import { getDemo } from '@/components/demos/registry';

type Viewport = 'mobile' | 'tablet' | 'desktop' | 'full';

/** Widths match blocks.so / shadcn BlockViewer intent (real CSS viewport via iframe). */
const VIEWPORTS: {
  id: Viewport;
  label: string;
  /** iframe wrapper width — null = 100% of host */
  width: string | null;
  icon: React.ReactNode;
}[] = [
  { id: 'mobile', label: 'Mobile', width: '375px', icon: <SmartphoneIcon className="size-4" /> },
  { id: 'tablet', label: 'Tablet', width: '768px', icon: <TabletIcon className="size-4" /> },
  { id: 'desktop', label: 'Desktop', width: null, icon: <MonitorIcon className="size-4" /> },
  { id: 'full', label: 'Full width', width: null, icon: <Maximize2Icon className="size-4" /> },
];

export interface ComponentPreviewProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  title?: string;
  /** Demo registry key — enables iframe preview (blocks.so pattern). */
  name?: string;
  code?: string;
  lang?: string;
  align?: 'start' | 'center';
  /** @deprecated Use `align="center"` */
  center?: boolean;
  fullWidth?: boolean;
  defaultViewport?: Viewport;
  hideViewport?: boolean;
  /** Override iframe height (px). Defaults from demo registry. */
  iframeHeight?: number;
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

/**
 * Docs component preview — blocks.so / shadcn BlockViewer pattern:
 * when `name` is set, render demo in an **iframe** so mobile/tablet
 * changes the real CSS viewport (sm:/md: work correctly).
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
  defaultViewport = 'desktop',
  hideViewport = false,
  iframeHeight: iframeHeightProp,
  ...props
}: ComponentPreviewProps) {
  const [activeTab, setActiveTab] = React.useState<'preview' | 'code'>('preview');
  const [iframeKey, setIframeKey] = React.useState(0);
  const [spinning, setSpinning] = React.useState(false);
  const [previewTheme, setPreviewTheme] = React.useState<'light' | 'dark'>('light');
  const [viewport, setViewport] = React.useState<Viewport>(
    fullWidth && defaultViewport === 'desktop' ? 'full' : defaultViewport,
  );
  const [openPreview, setOpenPreview] = React.useState(false);

  const demo = name ? getDemo(name) : undefined;
  const useIframe = Boolean(name && demo);
  const iframeHeight = iframeHeightProp ?? demo?.iframeHeight ?? 640;
  const vp = VIEWPORTS.find((v) => v.id === viewport) ?? VIEWPORTS[2];

  const previewSrc = name
    ? `/preview/${name}/?theme=${previewTheme}`
    : undefined;

  const replay = () => {
    setSpinning(true);
    setIframeKey((k) => k + 1);
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

  /** Iframe stage — real viewport isolation (industry standard for blocks). */
  const iframeStage = previewSrc ? (
    <div
      className={cn(
        'bg-fd-muted/15',
        viewport === 'mobile' || viewport === 'tablet'
          ? 'flex justify-center p-3 sm:justify-start sm:p-4'
          : '',
      )}
    >
      <div
        className={cn(
          'overflow-hidden rounded-lg border border-fd-border bg-background shadow-none',
          !vp.width && 'w-full',
        )}
        style={{
          width: vp.width ?? '100%',
          maxWidth: '100%',
        }}
      >
        <iframe
          key={`${iframeKey}-${previewTheme}-${viewport}`}
          title={title || name || 'Component preview'}
          src={previewSrc}
          loading="lazy"
          className="relative z-10 block w-full border-0 bg-background"
          style={{ height: iframeHeight }}
        />
      </div>
    </div>
  ) : null;

  /** Fallback inline canvas when no registry name (rare). */
  const contentAlign = align ?? (center ? 'center' : 'start');
  const inlineStage = (
    <div
      className={cn(
        'bp-preview-surface min-h-[280px] w-full min-w-0 p-4 sm:p-6',
        previewTheme === 'dark' && 'dark',
        contentAlign === 'center'
          ? 'flex items-center justify-center'
          : 'flex items-start justify-start',
      )}
    >
      <div className="w-full min-w-0 max-w-none">{children}</div>
    </div>
  );

  const stage = useIframe ? iframeStage : inlineStage;

  return (
    <div className={cn('not-prose my-6 w-full', className)} data-component={name} {...props}>
      {title ? (
        <p className="mb-2 text-left text-sm font-medium text-fd-muted-foreground">{title}</p>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-fd-border bg-fd-card">
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
            {previewSrc ? (
              <a
                href={previewSrc}
                target="_blank"
                rel="noreferrer"
                className={cn(
                  'inline-flex size-8 items-center justify-center rounded-md border border-fd-border bg-fd-background shadow-none',
                  'text-fd-muted-foreground hover:bg-fd-muted/60 hover:text-fd-foreground',
                )}
                aria-label="Open full preview"
                title="Open full preview"
              >
                <ExternalLinkIcon className="size-4" />
              </a>
            ) : (
              <ToolbarButton
                onClick={() => setOpenPreview(true)}
                label="Open full preview"
                className="size-8 rounded-md border border-fd-border bg-fd-background"
              >
                <ExternalLinkIcon className="size-4" />
              </ToolbarButton>
            )}
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

      {/* Modal only for rare non-iframe previews */}
      {openPreview && !useIframe ? (
        <div
          className="fixed inset-0 z-[200] flex flex-col bg-black/50 p-3 backdrop-blur-sm sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label="Component preview"
          onClick={() => setOpenPreview(false)}
        >
          <div
            className="mx-auto flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-fd-border bg-fd-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 border-b border-fd-border px-3 py-2">
              <span className="text-sm font-medium">{title || name || 'Preview'}</span>
              <button
                type="button"
                onClick={() => setOpenPreview(false)}
                className="inline-flex items-center gap-1.5 rounded-md border border-fd-border px-3 py-1.5 text-xs"
              >
                <XIcon className="size-3.5" />
                Close
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto">{inlineStage}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
