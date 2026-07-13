import type { ReactNode } from 'react';
import { docs } from '../../.source';
import rootMeta from '../content/docs/meta.json';
import uiMeta from '../content/docs/ui/meta.json';
import coreMeta from '../content/docs/core/meta.json';
import providersMeta from '../content/docs/providers/meta.json';
import billingMeta from '../content/docs/billing/meta.json';

/** Normalize content path: `ui/index.mdx` → `ui` */
function docPath(filePath?: string): string {
  const raw = (filePath || '').replace(/\.mdx$/, '');
  if (raw.endsWith('/index')) return raw.slice(0, -'/index'.length);
  if (raw === 'index') return '';
  return raw;
}

function pageUrl(path: string): string {
  return path === '' ? '/introduction' : `/${path}`;
}

type DocEntry = (typeof docs)[number];

const docsByPath = new Map<string, DocEntry>();
for (const d of docs) {
  docsByPath.set(docPath(d._file?.path), d);
}

type MetaEntry = {
  title?: string;
  pages?: string[];
  defaultOpen?: boolean;
};

const metaByDir = new Map<string, MetaEntry>([
  ['', rootMeta as MetaEntry],
  ['ui', uiMeta as MetaEntry],
  ['core', coreMeta as MetaEntry],
  ['providers', providersMeta as MetaEntry],
  ['billing', billingMeta as MetaEntry],
]);

type TreeNode =
  | { type: 'page'; name: ReactNode; url: string }
  | { type: 'separator'; name: ReactNode }
  | {
      type: 'folder';
      name: ReactNode;
      defaultOpen?: boolean;
      index?: { type: 'page'; name: ReactNode; url: string };
      children: TreeNode[];
    };

function resolvePageName(path: string): string {
  const doc = docsByPath.get(path);
  if (doc?.title) return String(doc.title);
  const segment = path.split('/').pop() || path;
  return segment
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
}

function buildFromMeta(dir: string): TreeNode[] {
  const m = metaByDir.get(dir);
  if (!m?.pages?.length) {
    return docs
      .map((d) => docPath(d._file?.path))
      .filter((p) => {
        if (!p) return false;
        if (dir === '') return !p.includes('/');
        return p.startsWith(`${dir}/`) && !p.slice(dir.length + 1).includes('/');
      })
      .sort()
      .map((p) => ({
        type: 'page' as const,
        name: resolvePageName(p),
        url: pageUrl(p),
      }));
  }

  const nodes: TreeNode[] = [];

  for (const item of m.pages) {
    if (item.startsWith('---') && item.endsWith('---')) {
      nodes.push({ type: 'separator', name: item.slice(3, -3).trim() });
      continue;
    }

    // Rest folder: "...ui"
    if (item.startsWith('...')) {
      const folder = item.slice(3);
      const folderDir = dir === '' ? folder : `${dir}/${folder}`;
      const folderMeta = metaByDir.get(folderDir);
      const indexDoc = docsByPath.get(folderDir);
      const children = buildFromMeta(folderDir).filter((n) => {
        if (n.type === 'page' && n.url === pageUrl(folderDir)) return false;
        return true;
      });

      nodes.push({
        type: 'folder',
        name: folderMeta?.title || resolvePageName(folder),
        defaultOpen: folderMeta?.defaultOpen ?? folder === 'ui',
        index: indexDoc
          ? {
              type: 'page',
              name: String(indexDoc.title || resolvePageName(folder)),
              url: pageUrl(folderDir),
            }
          : undefined,
        children,
      });
      continue;
    }

    // Relative path under current dir
    const pagePath =
      item === 'index' ? dir : dir === '' ? item : `${dir}/${item}`;

    // Nested folder with its own meta (rare)
    if (!item.includes('/') && metaByDir.has(pagePath) && item !== 'index') {
      const nestedMeta = metaByDir.get(pagePath);
      const indexDoc = docsByPath.get(pagePath);
      const children = buildFromMeta(pagePath).filter((n) => {
        if (n.type === 'page' && n.url === pageUrl(pagePath)) return false;
        return true;
      });
      nodes.push({
        type: 'folder',
        name: nestedMeta?.title || resolvePageName(item),
        defaultOpen: nestedMeta?.defaultOpen,
        index: indexDoc
          ? {
              type: 'page',
              name: String(indexDoc.title || resolvePageName(item)),
              url: pageUrl(pagePath),
            }
          : undefined,
        children,
      });
      continue;
    }

    if (item === 'index' && dir) {
      // Folder index is attached by parent as `index`
      continue;
    }

    const doc = docsByPath.get(pagePath);
    if (!doc) continue;

    nodes.push({
      type: 'page',
      name: String(doc.title || resolvePageName(pagePath)),
      url: pageUrl(pagePath),
    });
  }

  return nodes;
}

export function getPage(slug?: string[]) {
  const path = slug && slug.length > 0 ? slug.join('/') : 'introduction';

  const doc = docs.find((d) => docPath(d._file?.path) === path);
  return doc ? { data: doc, slugs: slug || ['introduction'] } : null;
}

export function getPages() {
  return docs.map((d) => {
    const path = docPath(d._file?.path);
    const slugs = path === '' ? [] : path.split('/');
    return { data: d, slugs };
  });
}

export const pageTree = {
  name: 'Documentation',
  children: buildFromMeta(''),
};
