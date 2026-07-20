/**
 * Structural checks that the dogfood polish preserves IA and light premium chrome.
 * Runs via vitest if wired; also imported by verify script for static assert.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function read(rel: string) {
  return readFileSync(join(root, rel), 'utf8');
}

export function assertDogfoodPolishStructure() {
  const shell = read('src/components/Shell.tsx');
  const appShell = read('src/components/app-shell.tsx');
  const appShared = read('src/components/app-shared.tsx');
  const css = read('src/index.css');
  const helpers = read('src/components/HelpersPanel.tsx');
  const pages = [
    read('src/pages/Overview.tsx'),
    read('src/pages/Plans.tsx'),
    read('src/pages/Credits.tsx'),
    read('src/pages/Billing.tsx'),
    read('src/pages/Payments.tsx'),
  ];

  // IA: five nav routes (Efferd app-shell-8 + app-shared)
  for (const label of ['Overview', 'Plans', 'Credits', 'Billing', 'Payments']) {
    if (!appShared.includes(label)) {
      throw new Error(`Missing nav label: ${label}`);
    }
  }
  if (!shell.includes('AppShell') || !shell.includes('HelpersPanel')) {
    throw new Error('AppShell + HelpersPanel chrome missing');
  }
  if (!appShell.includes('SidebarProvider') || !appShell.includes('AppSidebar')) {
    throw new Error('Efferd AppShell structure missing');
  }
  if (!helpers.includes('Helpers') && !helpers.includes('helper-section')) {
    throw new Error('Helpers panel missing');
  }

  // Light premium chrome
  if (!css.includes('--background') && !css.includes('var(--background)')) {
    throw new Error('Light theme background missing from dogfood CSS');
  }
  if (!css.includes('dogfood-helpers') || !css.includes('helper-section')) {
    throw new Error('Helpers styling missing');
  }
  if (!css.includes('page-title') || !css.includes('metric-grid') || !css.includes('pay-row')) {
    throw new Error('Page rhythm utilities missing');
  }

  // Real paper-design shaders on focal moments only (headers + key cards)
  const pageHeader = read('src/components/PageHeader.tsx');
  const shaderAccent = read('src/components/ShaderAccent.tsx');
  if (!pageHeader.includes('ShaderAccent') || !pageHeader.includes('PageHeader')) {
    throw new Error('Expected PageHeader to mount ShaderAccent');
  }
  if (!shaderAccent.includes('@paper-design/shaders-react') || !shaderAccent.includes('MeshGradient')) {
    throw new Error('Expected real @paper-design/shaders-react MeshGradient');
  }
  const joined = pages.join('\n');
  if (!joined.includes('PageHeader')) {
    throw new Error('Expected PageHeader on dogfood pages');
  }
  if (!joined.includes('ShaderAccent') && !joined.includes('bp-shader-card')) {
    throw new Error('Expected restrained shader on selected key cards');
  }
  if (!css.includes('page-header')) {
    throw new Error('Expected page-header surface styling');
  }

  // Content still wired (not a marketing landing rewrite)
  if (!pages[0].includes('SubscriptionSummary') || !pages[0].includes('EntitlementMeter')) {
    throw new Error('Overview lost billing components');
  }
  if (!pages[1].includes('PricingTable')) {
    throw new Error('Plans lost PricingTable');
  }
  if (!pages[2].includes('catalog.packs') || !pages[2].includes('buyPack')) {
    throw new Error('Credits lost pack purchase flow');
  }
  if (!pages[3].includes('BillingPortal')) {
    throw new Error('Billing lost BillingPortal');
  }
  if (!pages[4].includes('payments.map') && !pages[4].includes('state.payments')) {
    throw new Error('Payments lost transaction list');
  }

  return true;
}

// tsx / node entry
const isMain =
  process.argv[1] &&
  (process.argv[1].endsWith('polish-structure.test.ts') ||
    process.argv[1].includes('polish-structure'));
if (isMain) {
  assertDogfoodPolishStructure();
  console.log('dogfood polish structure: ok');
}
