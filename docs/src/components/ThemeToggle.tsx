'use client';

import * as React from 'react';
import { MoonIcon, SunIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface ThemeToggleProps {
  className?: string;
  size?: 'sm' | 'md';
  /** Controlled mode for scoped preview theme */
  theme?: 'light' | 'dark';
  onThemeChange?: (theme: 'light' | 'dark') => void;
}

/**
 * Light / dark switch.
 * Controlled (`theme` + `onThemeChange`) scopes to a parent; uncontrolled uses local state only.
 */
export function ThemeToggle({
  className,
  size = 'sm',
  theme: controlled,
  onThemeChange,
}: ThemeToggleProps) {
  const [uncontrolled, setUncontrolled] = React.useState<'light' | 'dark'>('light');
  const theme = controlled ?? uncontrolled;
  const isDark = theme === 'dark';

  const toggle = () => {
    const next = isDark ? 'light' : 'dark';
    if (controlled === undefined) setUncontrolled(next);
    onThemeChange?.(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        'inline-flex items-center justify-center rounded-md border border-fd-border bg-fd-background text-fd-foreground transition-colors shadow-none',
        'hover:bg-fd-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring',
        size === 'sm' ? 'size-8' : 'size-9',
        className,
      )}
      aria-label={isDark ? 'Preview light mode' : 'Preview dark mode'}
      title={isDark ? 'Preview light' : 'Preview dark'}
    >
      {isDark ? <SunIcon className="size-4" /> : <MoonIcon className="size-4" />}
    </button>
  );
}
