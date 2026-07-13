'use client';

import * as React from 'react';
import { useTheme } from 'next-themes';
import { MoonIcon, SunIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface ThemeToggleProps {
  className?: string;
  /** Compact icon-only button (default) */
  size?: 'sm' | 'md';
}

/**
 * Light / dark switch using next-themes (fumadocs RootProvider).
 */
export function ThemeToggle({ className, size = 'sm' }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === 'dark';

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={cn(
        'inline-flex items-center justify-center rounded-lg border border-fd-border bg-fd-card text-fd-foreground shadow-sm transition-colors',
        'hover:bg-fd-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring',
        size === 'sm' ? 'size-9' : 'size-10',
        className,
      )}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light' : 'Dark'}
    >
      {!mounted ? (
        <SunIcon className="size-4 opacity-50" />
      ) : isDark ? (
        <SunIcon className="size-4" />
      ) : (
        <MoonIcon className="size-4" />
      )}
    </button>
  );
}
