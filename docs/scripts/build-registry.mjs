#!/usr/bin/env node
/**
 * Build a shadcn-compatible registry for @betterpay/ui.
 *
 * Output (flat, under docs/public/r/):
 *   registry.json          — catalog (no file contents) for list/search + directory index
 *   index.json             — alias of registry.json (legacy)
 *   {name}.json            — installable items (with content)
 *
 * Namespace:
 *   npx shadcn@latest registry add @betterpay=https://ui.betterpay.dev/r/{name}.json
 *   npx shadcn@latest add @betterpay/plan-card
 *
 * URL install:
 *   npx shadcn@latest add https://ui.betterpay.dev/r/plan-card.json
 *   npx shadcn@latest list https://ui.betterpay.dev/r/registry.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const docsRoot = path.resolve(__dirname, '..');
const uiRoot = path.resolve(docsRoot, '../packages/ui');
const outDir = path.join(docsRoot, 'public/r');

const BASE_URL =
  process.env.BETTERPAY_REGISTRY_URL || 'https://ui.betterpay.dev/r';
const HOMEPAGE =
  process.env.BETTERPAY_DOCS_URL || 'https://ui.betterpay.dev';
const NAMESPACE = '@betterpay';

/**
 * @typedef {{
 *   title: string;
 *   description: string;
 *   file: string;
 *   deps?: string[];
 *   registryDeps?: string[];
 *   type?: string;
 *   target?: string;
 *   path?: string;
 * }} ComponentMeta
 */

/** @type {Record<string, ComponentMeta>} */
const COMPONENTS = {
  'plan-card': {
    title: 'Plan Card',
    description: 'Compound card for a single pricing plan',
    file: 'src/components/plan-card.tsx',
    path: 'registry/betterpay/plan-card.tsx',
    deps: ['lucide-react', 'class-variance-authority'],
    registryDeps: ['button', 'badge', 'card', 'utils', 'money', 'billing-ui-types'],
    type: 'registry:component',
    target: '@components/betterpay/plan-card.tsx',
  },
  'plan-group': {
    title: 'Plan Group',
    description: 'Interval context and plan grid',
    file: 'src/components/plan-group.tsx',
    path: 'registry/betterpay/plan-group.tsx',
    deps: ['class-variance-authority'],
    registryDeps: ['plan-card', 'switch', 'use-controllable-state'],
    type: 'registry:component',
    target: '@components/betterpay/plan-group.tsx',
  },
  'pricing-table': {
    title: 'Pricing Table',
    description: 'Opinionated pricing section',
    file: 'src/components/pricing-table.tsx',
    path: 'registry/betterpay/pricing-table.tsx',
    deps: ['class-variance-authority'],
    registryDeps: ['plan-group'],
    type: 'registry:component',
    target: '@components/betterpay/pricing-table.tsx',
  },
  'plan-comparison': {
    title: 'Plan Comparison',
    description: 'Feature × plan comparison matrix',
    file: 'src/components/plan-comparison.tsx',
    path: 'registry/betterpay/plan-comparison.tsx',
    deps: ['lucide-react'],
    registryDeps: ['button', 'badge', 'money', 'billing-ui-types'],
    type: 'registry:component',
    target: '@components/betterpay/plan-comparison.tsx',
  },
  'subscription-summary': {
    title: 'Subscription Summary',
    description: 'Current plan status and next charge',
    file: 'src/components/subscription-summary.tsx',
    path: 'registry/betterpay/subscription-summary.tsx',
    registryDeps: ['button', 'badge', 'card', 'separator', 'money', 'dates', 'status', 'billing-ui-types'],
    type: 'registry:component',
    target: '@components/betterpay/subscription-summary.tsx',
  },
  'plan-switcher': {
    title: 'Plan Switcher',
    description: 'Dialog to change plan',
    file: 'src/components/plan-switcher.tsx',
    path: 'registry/betterpay/plan-switcher.tsx',
    registryDeps: ['button', 'badge', 'dialog', 'money', 'billing-ui-types'],
    type: 'registry:component',
    target: '@components/betterpay/plan-switcher.tsx',
  },
  'cancel-flow': {
    title: 'Cancel Flow',
    description: 'Cancel subscription confirmation',
    file: 'src/components/cancel-flow.tsx',
    path: 'registry/betterpay/cancel-flow.tsx',
    registryDeps: ['button', 'dialog', 'billing-ui-types'],
    type: 'registry:component',
    target: '@components/betterpay/cancel-flow.tsx',
  },
  'entitlement-meter': {
    title: 'Entitlement Meter',
    description: 'Single feature usage meter',
    file: 'src/components/entitlement-meter.tsx',
    path: 'registry/betterpay/entitlement-meter.tsx',
    registryDeps: ['card', 'billing-ui-types'],
    type: 'registry:component',
    target: '@components/betterpay/entitlement-meter.tsx',
  },
  'usage-summary': {
    title: 'Usage Summary',
    description: 'Multi-meter usage panel',
    file: 'src/components/usage-summary.tsx',
    path: 'registry/betterpay/usage-summary.tsx',
    deps: ['lucide-react'],
    registryDeps: ['button', 'card', 'entitlement-meter', 'billing-ui-types'],
    type: 'registry:component',
    target: '@components/betterpay/usage-summary.tsx',
  },
  'invoice-table': {
    title: 'Invoice Table',
    description: 'Desktop invoice history',
    file: 'src/components/invoice-table.tsx',
    path: 'registry/betterpay/invoice-table.tsx',
    registryDeps: ['button', 'badge', 'card', 'table', 'money', 'dates', 'status', 'billing-ui-types'],
    type: 'registry:component',
    target: '@components/betterpay/invoice-table.tsx',
  },
  'invoice-card': {
    title: 'Invoice Card',
    description: 'Mobile invoice row',
    file: 'src/components/invoice-card.tsx',
    path: 'registry/betterpay/invoice-card.tsx',
    deps: ['lucide-react'],
    registryDeps: ['button', 'badge', 'money', 'dates', 'status', 'billing-ui-types'],
    type: 'registry:component',
    target: '@components/betterpay/invoice-card.tsx',
  },
  'payment-status-banner': {
    title: 'Payment Status Banner',
    description: 'Payment status callout',
    file: 'src/components/payment-status-banner.tsx',
    path: 'registry/betterpay/payment-status-banner.tsx',
    deps: ['lucide-react'],
    registryDeps: ['button', 'status'],
    type: 'registry:component',
    target: '@components/betterpay/payment-status-banner.tsx',
  },
  'billing-portal': {
    title: 'Billing Portal',
    description: 'Composed billing page layout',
    file: 'src/components/billing-portal.tsx',
    path: 'registry/betterpay/billing-portal.tsx',
    registryDeps: [
      'subscription-summary',
      'plan-switcher',
      'cancel-flow',
      'usage-summary',
      'invoice-table',
      'invoice-card',
      'payment-status-banner',
      'billing-ui-types',
    ],
    type: 'registry:block',
    target: '@components/betterpay/billing-portal.tsx',
  },
  utils: {
    title: 'Utils',
    description: 'cn() helper (clsx + tailwind-merge)',
    file: 'src/lib/cn.ts',
    path: 'registry/betterpay/lib/utils.ts',
    deps: ['clsx', 'tailwind-merge'],
    type: 'registry:lib',
    target: '@lib/utils.ts',
  },
  money: {
    title: 'Money',
    description: 'formatMoney helpers (IDR-first)',
    file: 'src/lib/money.ts',
    path: 'registry/betterpay/lib/money.ts',
    type: 'registry:lib',
    target: '@lib/money.ts',
  },
  dates: {
    title: 'Dates',
    description: 'formatDisplayDate',
    file: 'src/lib/dates.ts',
    path: 'registry/betterpay/lib/dates.ts',
    type: 'registry:lib',
    target: '@lib/dates.ts',
  },
  status: {
    title: 'Status',
    description: 'Status presentation maps',
    file: 'src/lib/status.ts',
    path: 'registry/betterpay/lib/status.ts',
    type: 'registry:lib',
    target: '@lib/status.ts',
  },
  'use-controllable-state': {
    title: 'useControllableState',
    description: 'Controlled/uncontrolled state hook',
    file: 'src/lib/use-controllable-state.ts',
    path: 'registry/betterpay/hooks/use-controllable-state.ts',
    type: 'registry:hook',
    target: '@hooks/use-controllable-state.ts',
  },
  button: {
    title: 'Button',
    description: 'Base UI button',
    file: 'src/primitives/button.tsx',
    path: 'registry/betterpay/ui/button.tsx',
    deps: ['@base-ui/react', 'class-variance-authority'],
    registryDeps: ['utils'],
    type: 'registry:ui',
    target: '@ui/button.tsx',
  },
  badge: {
    title: 'Badge',
    description: 'Status badge',
    file: 'src/primitives/badge.tsx',
    path: 'registry/betterpay/ui/badge.tsx',
    deps: ['@base-ui/react', 'class-variance-authority'],
    registryDeps: ['utils', 'status'],
    type: 'registry:ui',
    target: '@ui/badge.tsx',
  },
  card: {
    title: 'Card',
    description: 'Card surface',
    file: 'src/primitives/card.tsx',
    path: 'registry/betterpay/ui/card.tsx',
    registryDeps: ['utils'],
    type: 'registry:ui',
    target: '@ui/card.tsx',
  },
  dialog: {
    title: 'Dialog',
    description: 'Base UI dialog',
    file: 'src/primitives/dialog.tsx',
    path: 'registry/betterpay/ui/dialog.tsx',
    deps: ['@base-ui/react', 'lucide-react'],
    registryDeps: ['utils', 'button'],
    type: 'registry:ui',
    target: '@ui/dialog.tsx',
  },
  switch: {
    title: 'Switch',
    description: 'Base UI switch',
    file: 'src/primitives/switch.tsx',
    path: 'registry/betterpay/ui/switch.tsx',
    deps: ['@base-ui/react'],
    registryDeps: ['utils'],
    type: 'registry:ui',
    target: '@ui/switch.tsx',
  },
  separator: {
    title: 'Separator',
    description: 'Base UI separator',
    file: 'src/primitives/separator.tsx',
    path: 'registry/betterpay/ui/separator.tsx',
    deps: ['@base-ui/react'],
    registryDeps: ['utils'],
    type: 'registry:ui',
    target: '@ui/separator.tsx',
  },
  table: {
    title: 'Table',
    description: 'Table primitives',
    file: 'src/primitives/table.tsx',
    path: 'registry/betterpay/ui/table.tsx',
    registryDeps: ['utils'],
    type: 'registry:ui',
    target: '@ui/table.tsx',
  },
  'billing-ui-types': {
    title: 'Billing UI Types',
    description: 'PlanView, SubscriptionView, InvoiceView, and related view-models',
    file: 'src/types/billing-ui.ts',
    path: 'registry/betterpay/types/billing-ui.ts',
    registryDeps: ['status'],
    type: 'registry:lib',
    target: 'types/billing-ui.ts',
  },
};

function readSource(rel) {
  const abs = path.join(uiRoot, rel);
  if (!fs.existsSync(abs)) {
    throw new Error(`Missing source: ${abs}`);
  }
  return fs.readFileSync(abs, 'utf8');
}

function rewriteImports(content) {
  return content
    .replaceAll("from '../lib/cn'", "from '@/lib/utils'")
    .replaceAll("from '../lib/money'", "from '@/lib/money'")
    .replaceAll("from '../lib/dates'", "from '@/lib/dates'")
    .replaceAll("from '../lib/status'", "from '@/lib/status'")
    .replaceAll("from '../lib/use-controllable-state'", "from '@/hooks/use-controllable-state'")
    .replaceAll("from '../types/billing-ui'", "from '@/types/billing-ui'")
    .replaceAll("from '../primitives/button'", "from '@/components/ui/button'")
    .replaceAll("from '../primitives/badge'", "from '@/components/ui/badge'")
    .replaceAll("from '../primitives/card'", "from '@/components/ui/card'")
    .replaceAll("from '../primitives/dialog'", "from '@/components/ui/dialog'")
    .replaceAll("from '../primitives/switch'", "from '@/components/ui/switch'")
    .replaceAll("from '../primitives/separator'", "from '@/components/ui/separator'")
    .replaceAll("from '../primitives/table'", "from '@/components/ui/table'")
    .replaceAll("from './plan-card'", "from '@/components/betterpay/plan-card'")
    .replaceAll("from './plan-group'", "from '@/components/betterpay/plan-group'")
    .replaceAll("from './entitlement-meter'", "from '@/components/betterpay/entitlement-meter'")
    .replaceAll("from './subscription-summary'", "from '@/components/betterpay/subscription-summary'")
    .replaceAll("from './plan-switcher'", "from '@/components/betterpay/plan-switcher'")
    .replaceAll("from './cancel-flow'", "from '@/components/betterpay/cancel-flow'")
    .replaceAll("from './usage-summary'", "from '@/components/betterpay/usage-summary'")
    .replaceAll("from './invoice-table'", "from '@/components/betterpay/invoice-table'")
    .replaceAll("from './invoice-card'", "from '@/components/betterpay/invoice-card'")
    .replaceAll("from './payment-status-banner'", "from '@/components/betterpay/payment-status-banner'");
}

function resolveTarget(name, meta) {
  if (meta.target) {
    // Prefer placeholders; fall back for types outside @lib
    if (meta.target.startsWith('@')) return meta.target;
    return meta.target;
  }
  if (meta.type === 'registry:lib') return `@lib/${name}.ts`;
  if (meta.type === 'registry:hook') return `@hooks/${name}.ts`;
  if (meta.type === 'registry:ui') return `@ui/${name}.tsx`;
  return `@components/betterpay/${name}.tsx`;
}

function fileTypeFor(meta) {
  const t = meta.type || 'registry:component';
  if (t === 'registry:block') return 'registry:component';
  return t;
}

function resolveRegistryDeps(deps = []) {
  return deps.map((d) => {
    if (d.startsWith('http') || d.startsWith('@')) return d;
    if (COMPONENTS[d]) return `${NAMESPACE}/${d}`;
    return d;
  });
}

function buildItem(name, meta, { withContent }) {
  const type = meta.type || 'registry:component';
  const registryPath = meta.path || `registry/betterpay/${name}.tsx`;
  const target = resolveTarget(name, meta);

  /** @type {Record<string, unknown>} */
  const file = {
    path: registryPath,
    type: fileTypeFor(meta),
    target,
  };

  if (withContent) {
    const raw =
      name === 'billing-ui-types'
        ? readSource(meta.file).replaceAll("from '../lib/status'", "from '@/lib/status'")
        : rewriteImports(readSource(meta.file));
    file.content = raw;
  }

  /** @type {Record<string, unknown>} */
  const item = {
    $schema: 'https://ui.shadcn.com/schema/registry-item.json',
    name,
    type,
    title: meta.title,
    description: meta.description,
  };

  if (meta.deps?.length) item.dependencies = meta.deps;
  const regDeps = resolveRegistryDeps(meta.registryDeps);
  if (regDeps.length) item.registryDependencies = regDeps;
  item.files = [file];

  return item;
}

function buildCatalog() {
  const items = Object.entries(COMPONENTS).map(([name, meta]) => {
    // Catalog entries must NOT include file content (registry directory requirement).
    const item = buildItem(name, meta, { withContent: false });
    // Drop $schema noise in catalog list items if desired — keep for clarity.
    return item;
  });

  return {
    $schema: 'https://ui.shadcn.com/schema/registry.json',
    name: 'betterpay',
    homepage: HOMEPAGE,
    items,
  };
}

/** Entry for shadcn-ui/ui apps/v4/registry/directory.json (PR submission). */
function buildDirectoryEntry() {
  return {
    name: NAMESPACE,
    homepage: HOMEPAGE,
    url: `${BASE_URL}/{name}.json`,
    description:
      'Billing and payments UI for Indonesia — pricing tables, subscription portal, invoices, usage meters. Base UI + Tailwind. Install with the shadcn CLI.',
  };
}

// Clean previous generated JSON (keep directory)
fs.mkdirSync(outDir, { recursive: true });
for (const f of fs.readdirSync(outDir)) {
  if (f.endsWith('.json')) fs.unlinkSync(path.join(outDir, f));
}

const catalog = buildCatalog();
const catalogJson = JSON.stringify(catalog, null, 2) + '\n';

fs.writeFileSync(path.join(outDir, 'registry.json'), catalogJson);
// Legacy alias — some older docs pointed at index.json
fs.writeFileSync(path.join(outDir, 'index.json'), catalogJson);

for (const [name, meta] of Object.entries(COMPONENTS)) {
  const item = buildItem(name, meta, { withContent: true });
  fs.writeFileSync(path.join(outDir, `${name}.json`), JSON.stringify(item, null, 2) + '\n');
  console.log('wrote', name);
}

const dirEntry = buildDirectoryEntry();
fs.writeFileSync(
  path.join(docsRoot, 'registry-directory-entry.json'),
  JSON.stringify(dirEntry, null, 2) + '\n',
);

console.log('Registry built →', outDir);
console.log('Catalog:     ', `${BASE_URL}/registry.json`);
console.log('Namespace:   ', `${NAMESPACE}=${BASE_URL}/{name}.json`);
console.log('Example add: ', `npx shadcn@latest add ${NAMESPACE}/plan-card`);
console.log('Directory:   ', path.join(docsRoot, 'registry-directory-entry.json'));
