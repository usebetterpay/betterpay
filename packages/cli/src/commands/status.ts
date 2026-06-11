// ── betterpay status ─────────────────────────────────────────────────────
// Check current BetterPay configuration and migration status.

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export async function statusCommand(args: string[]): Promise<void> {
  const cwd = args[0] ?? process.cwd();

  console.log('📊 BetterPay Status\n');

  // 1. Check package.json
  const pkgPath = join(cwd, 'package.json');
  if (!existsSync(pkgPath)) {
    console.error(`❌ No package.json found in ${cwd}`);
    process.exit(1);
  }

  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

  // 2. Check installed packages (grouped)
  const packageGroups = [
    {
      name: 'Core',
      packages: ['@betterpay/core', '@betterpay/client', '@betterpay/cli'],
    },
    {
      name: 'Providers',
      packages: ['@betterpay/midtrans', '@betterpay/xendit', '@betterpay/duitku', '@betterpay/pakasir'],
    },
    {
      name: 'Billing',
      packages: ['@betterpay/billing', '@betterpay/drizzle-adapter'],
    },
    {
      name: 'Framework Handlers',
      packages: ['@betterpay/next', '@betterpay/hono', '@betterpay/express', '@betterpay/bun', '@betterpay/cloudflare'],
    },
    {
      name: 'Notifications',
      packages: ['@betterpay/notification-email', '@betterpay/notification-whatsapp'],
    },
  ];

  for (const group of packageGroups) {
    console.log(`\n   ${group.name}:`);
    for (const pkg of group.packages) {
      const version = allDeps[pkg];
      if (version) {
        console.log(`   ✅ ${pkg} ${version}`);
      } else {
        console.log(`   ⬜ ${pkg} (not installed)`);
      }
    }
  }

  // 3. Check billing config
  const billingFile = findBillingFile(cwd);
  console.log(`\n   Billing config: ${billingFile ? `✅ ${billingFile}` : '❌ Not found'}`);

  // 4. Check DATABASE_URL
  const dbUrl = process.env.DATABASE_URL;
  console.log(`   Database URL:   ${dbUrl ? '✅ Configured' : '⚠️  Not set'}`);

  // 5. Check for .env
  const envFile = join(cwd, '.env');
  console.log(`   .env file:      ${existsSync(envFile) ? '✅ Found' : '⚠️  Not found'}`);

  // 6. Framework detection
  const framework = detectFramework(allDeps);
  console.log(`   Framework:      ${framework}`);

  console.log('');
}

function findBillingFile(cwd: string): string | null {
  const candidates = ['billing.ts', 'billing.js', 'billing.mjs', 'src/billing.ts', 'src/billing.js'];
  for (const file of candidates) {
    if (existsSync(join(cwd, file))) return file;
  }
  return null;
}

function detectFramework(deps: Record<string, string>): string {
  if (deps.next) return 'Next.js';
  if (deps.hono) return 'Hono';
  if (deps.express) return 'Express';
  if (deps.fastify) return 'Fastify';
  return 'Node.js (generic)';
}
