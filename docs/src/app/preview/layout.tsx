import type { ReactNode } from 'react';

/**
 * Minimal chrome for iframe previews (blocks.so / shadcn BlockViewer pattern).
 * Root layout still provides fonts, tokens, and RootProvider.
 */
export default function PreviewLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen w-full bg-background text-foreground antialiased">
      {children}
    </div>
  );
}
