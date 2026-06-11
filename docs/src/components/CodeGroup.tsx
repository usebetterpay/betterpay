import type { ReactNode } from 'react';

interface CodeGroupProps {
  children: ReactNode;
}

export function CodeGroup({ children }: CodeGroupProps) {
  return <div className="code-group">{children}</div>;
}
