import type { ReactNode } from 'react';
import { ShaderAccent } from './ShaderAccent';

export function PageHeader({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-header">
      <ShaderAccent variant="header" />
      <h1 className="page-title">{title}</h1>
      {children ? <div className="page-desc">{children}</div> : null}
    </div>
  );
}
