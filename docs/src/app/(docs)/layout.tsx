import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import type { ReactNode } from 'react';
import { pageTree } from '@/lib/source';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      tree={pageTree}
      nav={{
        title: 'BetterPay',
        url: '/',
      }}
      sidebar={{
        defaultOpenLevel: 1,
      }}
      links={[
        {
          text: 'GitHub',
          url: 'https://github.com/usebetterpay/betterpay',
          external: true,
        },
      ]}
    >
      {children}
    </DocsLayout>
  );
}
