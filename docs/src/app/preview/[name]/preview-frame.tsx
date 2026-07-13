'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { getDemo } from '@/components/demos/registry';
import { cn } from '@/lib/cn';

/**
 * Isolated demo surface for iframe embedding.
 * Query: ?theme=dark|light (default light)
 */
export function PreviewFrame({ name }: { name: string }) {
  const searchParams = useSearchParams();
  const theme = searchParams.get('theme') === 'dark' ? 'dark' : 'light';
  const entry = getDemo(name);

  if (!entry) {
    return (
      <div className="p-6 text-sm text-muted-foreground">Unknown demo: {name}</div>
    );
  }

  const Demo = entry.component;

  return (
    <div
      data-preview-theme={theme}
      className={cn(
        'bp-preview-surface min-h-screen w-full p-4 sm:p-6',
        theme === 'dark' && 'dark',
      )}
    >
      <Demo />
    </div>
  );
}
