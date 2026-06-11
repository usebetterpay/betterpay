import { docs, meta } from '../../.source';

export function getPage(slug?: string[]) {
  const path = slug ? slug.join('/') : 'introduction';
  
  const doc = docs.find((d) => {
    const docPath = d._file?.path?.replace(/\.mdx$/, '') || '';
    return docPath === path;
  });
  
  return doc ? { data: doc, slugs: slug || [] } : null;
}

export function getPages() {
  return docs.map((d) => ({
    data: d,
    slugs: (d._file?.path?.replace(/\.mdx$/, '') || '').split('/'),
  }));
}

export const pageTree = {
  name: 'Documentation',
  children: docs.map((d) => ({
    type: 'page' as const,
    name: d.title || 'Untitled',
    url: `/${(d._file?.path?.replace(/\.mdx$/, '') || '').split('/').join('/')}`,
  })),
};
