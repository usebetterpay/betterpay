import { docs } from '../../.source';

/** Normalize content path: `ui/index.mdx` → `ui`, `introduction.mdx` → `introduction` */
function docPath(filePath?: string): string {
  const raw = (filePath || '').replace(/\.mdx$/, '');
  if (raw.endsWith('/index')) return raw.slice(0, -'/index'.length);
  if (raw === 'index') return '';
  return raw;
}

export function getPage(slug?: string[]) {
  const path = slug && slug.length > 0 ? slug.join('/') : 'introduction';

  const doc = docs.find((d) => {
    const p = docPath(d._file?.path);
    return p === path;
  });

  return doc ? { data: doc, slugs: slug || ['introduction'] } : null;
}

export function getPages() {
  return docs.map((d) => {
    const path = docPath(d._file?.path);
    const slugs = path === '' ? [] : path.split('/');
    return {
      data: d,
      slugs,
    };
  });
}

export const pageTree = {
  name: 'Documentation',
  children: docs.map((d) => {
    const path = docPath(d._file?.path);
    const url = path === '' ? '/' : `/${path}`;
    return {
      type: 'page' as const,
      name: d.title || 'Untitled',
      url,
    };
  }),
};
