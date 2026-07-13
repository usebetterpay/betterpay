#!/usr/bin/env node
/**
 * Build a minimal shadcn-compatible registry for @betterpay/ui components.
 * Output: docs/public/r/*.json
 *
 * Install example:
 *   npx shadcn@latest add https://betterpay-docs.pages.dev/r/plan-card.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const docsRoot = path.resolve(__dirname, '..');
const uiRoot = path.resolve(docsRoot, '../packages/ui');
const outDir = path.join(docsRoot, 'public/r');

const BASE_URL = process.env.BETTERPAY_REGISTRY_URL || 'https://betterpay-docs.pages.dev/r';

/** @type {Record<string, { title: string; description: string; file: string; deps?: string[]; registryDeps?: string[] }>} */
const COMPONENTS = {
  'plan-card': {
    title: 'Plan Card',
    description: 'Compound card for a single pricing plan',
    file: 'src/components/plan-card.tsx',
    deps: ['lucide-react', 'class-variance-authority'],
    registryDeps: ['button', 'badge', 'card', 'utils', 'money'],
  },
  'plan-group': {
    title: 'Plan Group',
    description: 'Interval context and plan grid',
    file: 'src/components/plan-group.tsx',
    deps: ['class-variance-authority'],
    registryDeps: ['plan-card', 'switch', 'use-controllable-state'],
  },
  'pricing-table': {
    title: 'Pricing Table',
    description: 'Opinionated pricing section',
    file: 'src/components/pricing-table.tsx',
    deps: ['class-variance-authority'],
    registryDeps: ['plan-group'],
  },
  'plan-comparison': {
    title: 'Plan Comparison',
    description: 'Feature × plan comparison matrix',
    file: 'src/components/plan-comparison.tsx',
    deps: ['lucide-react'],
    registryDeps: ['button', 'badge', 'money'],
  },
  'subscription-summary': {
    title: 'Subscription Summary',
    description: 'Current plan status and next charge',
    file: 'src/components/subscription-summary.tsx',
    registryDeps: ['button', 'badge', 'card', 'separator', 'money', 'dates', 'status'],
  },
  'plan-switcher': {
    title: 'Plan Switcher',
    description: 'Dialog to change plan',
    file: 'src/components/plan-switcher.tsx',
    registryDeps: ['button', 'badge', 'dialog', 'money'],
  },
  'cancel-flow': {
    title: 'Cancel Flow',
    description: 'Cancel subscription confirmation',
    file: 'src/components/cancel-flow.tsx',
    registryDeps: ['button', 'dialog'],
  },
  'entitlement-meter': {
    title: 'Entitlement Meter',
    description: 'Single feature usage meter',
    file: 'src/components/entitlement-meter.tsx',
    registryDeps: ['card'],
  },
  'usage-summary': {
    title: 'Usage Summary',
    description: 'Multi-meter usage panel',
    file: 'src/components/usage-summary.tsx',
    deps: ['lucide-react'],
    registryDeps: ['button', 'card', 'entitlement-meter'],
  },
  'invoice-table': {
    title: 'Invoice Table',
    description: 'Desktop invoice history',
    file: 'src/components/invoice-table.tsx',
    registryDeps: ['button', 'badge', 'card', 'table', 'money', 'dates', 'status'],
  },
  'invoice-card': {
    title: 'Invoice Card',
    description: 'Mobile invoice row',
    file: 'src/components/invoice-card.tsx',
    deps: ['lucide-react'],
    registryDeps: ['button', 'badge', 'money', 'dates', 'status'],
  },
  'payment-status-banner': {
    title: 'Payment Status Banner',
    description: 'Payment status callout',
    file: 'src/components/payment-status-banner.tsx',
    deps: ['lucide-react'],
    registryDeps: ['button', 'status'],
  },
  'billing-portal': {
    title: 'Billing Portal',
    description: 'Composed billing page layout',
    file: 'src/components/billing-portal.tsx',
    registryDeps: [
      'subscription-summary',
      'plan-switcher',
      'cancel-flow',
      'usage-summary',
      'invoice-table',
      'invoice-card',
      'payment-status-banner',
    ],
  },
  // shared libs
  utils: {
    title: 'Utils',
    description: 'cn() helper',
    file: 'src/lib/cn.ts',
    deps: ['clsx', 'tailwind-merge'],
    type: 'registry:lib',
    target: 'lib/utils.ts',
  },
  money: {
    title: 'Money',
    description: 'formatMoney helpers',
    file: 'src/lib/money.ts',
    type: 'registry:lib',
    target: 'lib/money.ts',
  },
  dates: {
    title: 'Dates',
    description: 'formatDisplayDate',
    file: 'src/lib/dates.ts',
    type: 'registry:lib',
    target: 'lib/dates.ts',
  },
  status: {
    title: 'Status',
    description: 'Status presentation maps',
    file: 'src/lib/status.ts',
    type: 'registry:lib',
    target: 'lib/status.ts',
  },
  'use-controllable-state': {
    title: 'useControllableState',
    description: 'Controlled/uncontrolled state hook',
    file: 'src/lib/use-controllable-state.ts',
    type: 'registry:hook',
    target: 'hooks/use-controllable-state.ts',
  },
  // primitives (thin re-exports of Base UI styled components)
  button: {
    title: 'Button',
    description: 'Base UI button',
    file: 'src/primitives/button.tsx',
    deps: ['@base-ui/react', 'class-variance-authority'],
    registryDeps: ['utils'],
    type: 'registry:ui',
    target: 'components/ui/button.tsx',
  },
  badge: {
    title: 'Badge',
    description: 'Status badge',
    file: 'src/primitives/badge.tsx',
    deps: ['@base-ui/react', 'class-variance-authority'],
    registryDeps: ['utils', 'status'],
    type: 'registry:ui',
    target: 'components/ui/badge.tsx',
  },
  card: {
    title: 'Card',
    description: 'Card surface',
    file: 'src/primitives/card.tsx',
    registryDeps: ['utils'],
    type: 'registry:ui',
    target: 'components/ui/card.tsx',
  },
  dialog: {
    title: 'Dialog',
    description: 'Base UI dialog',
    file: 'src/primitives/dialog.tsx',
    deps: ['@base-ui/react', 'lucide-react'],
    registryDeps: ['utils', 'button'],
    type: 'registry:ui',
    target: 'components/ui/dialog.tsx',
  },
  switch: {
    title: 'Switch',
    description: 'Base UI switch',
    file: 'src/primitives/switch.tsx',
    deps: ['@base-ui/react'],
    registryDeps: ['utils'],
    type: 'registry:ui',
    target: 'components/ui/switch.tsx',
  },
  separator: {
    title: 'Separator',
    description: 'Base UI separator',
    file: 'src/primitives/separator.tsx',
    deps: ['@base-ui/react'],
    registryDeps: ['utils'],
    type: 'registry:ui',
    target: 'components/ui/separator.tsx',
  },
  table: {
    title: 'Table',
    description: 'Table primitives',
    file: 'src/primitives/table.tsx',
    registryDeps: ['utils'],
    type: 'registry:ui',
    target: 'components/ui/table.tsx',
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
  // Map package-relative imports to shadcn-style targets for consumers
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

function componentTarget(name, meta) {
  if (meta.target) return meta.target;
  if (meta.type === 'registry:lib') return `lib/${name}.ts`;
  if (meta.type === 'registry:hook') return `hooks/${name}.ts`;
  if (meta.type === 'registry:ui') return `components/ui/${name}.tsx`;
  return `components/betterpay/${name}.tsx`;
}

function buildItem(name, meta) {
  const type = meta.type || 'registry:block';
  const content = rewriteImports(readSource(meta.file));
  const target = componentTarget(name, meta);

  return {
    $schema: 'https://ui.shadcn.com/schema/registry-item.json',
    name,
    type,
    title: meta.title,
    description: meta.description,
    dependencies: meta.deps || [],
    registryDependencies: (meta.registryDeps || []).map((d) =>
      COMPONENTS[d] ? `${BASE_URL}/${d}.json` : d,
    ),
    files: [
      {
        path: meta.file,
        type: type === 'registry:block' ? 'registry:component' : type,
        target,
        content,
      },
    ],
  };
}

// Also ship billing-ui types once
function buildTypes() {
  const content = readSource('src/types/billing-ui.ts')
    .replaceAll("from '../lib/status'", "from '@/lib/status'");
  return {
    $schema: 'https://ui.shadcn.com/schema/registry-item.json',
    name: 'billing-ui-types',
    type: 'registry:lib',
    title: 'Billing UI Types',
    description: 'PlanView, SubscriptionView, InvoiceView, etc.',
    files: [
      {
        path: 'src/types/billing-ui.ts',
        type: 'registry:lib',
        target: 'types/billing-ui.ts',
        content,
      },
    ],
  };
}

function buildIndex() {
  const items = Object.keys(COMPONENTS).map((name) => ({
    name,
    title: COMPONENTS[name].title,
    description: COMPONENTS[name].description,
    url: `${BASE_URL}/${name}.json`,
  }));
  items.push({
    name: 'billing-ui-types',
    title: 'Billing UI Types',
    description: 'Shared view-model types',
    url: `${BASE_URL}/billing-ui-types.json`,
  });
  return {
    $schema: 'https://ui.shadcn.com/schema/registry.json',
    name: 'betterpay',
    homepage: 'https://betterpay-docs.pages.dev',
    items,
  };
}

fs.mkdirSync(outDir, { recursive: true });

for (const [name, meta] of Object.entries(COMPONENTS)) {
  const item = buildItem(name, meta);
  fs.writeFileSync(path.join(outDir, `${name}.json`), JSON.stringify(item, null, 2) + '\n');
  console.log('wrote', name);
}

fs.writeFileSync(
  path.join(outDir, 'billing-ui-types.json'),
  JSON.stringify(buildTypes(), null, 2) + '\n',
);
fs.writeFileSync(path.join(outDir, 'index.json'), JSON.stringify(buildIndex(), null, 2) + '\n');
console.log('Registry built →', outDir);
console.log('Example: npx shadcn@latest add', `${BASE_URL}/plan-card.json`);
