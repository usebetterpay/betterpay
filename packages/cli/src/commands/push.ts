// ── betterpay push ───────────────────────────────────────────────────────
// Apply database migrations and sync products to providers.
// Required in production (auto-migrate is disabled in prod).

import { existsSync } from 'node:fs';
import { join } from 'node:path';

export async function pushCommand(args: string[]): Promise<void> {
  const cwd = args[0] ?? process.cwd();
  const dryRun = args.includes('--dry-run');

  console.log(`🔧 BetterPay Push${dryRun ? ' (DRY RUN)' : ''}`);
  console.log(`   Working directory: ${cwd}\n`);

  // 1. Check for billing config
  const billingFile = findBillingFile(cwd);
  if (!billingFile) {
    console.error(`❌ No billing.ts or billing.js found in ${cwd}`);
    console.error(`   Run 'betterpay init' first.`);
    process.exit(1);
  }
  console.log(`   ✅ Found billing config: ${billingFile}`);

  // 2. Check DATABASE_URL
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error(`❌ DATABASE_URL not set`);
    console.error(`   Set it in .env or environment variables.`);
    process.exit(1);
  }
  console.log(`   ✅ Database URL configured`);

  // 3. In a full implementation, this would:
  //    a. Import the billing config
  //    b. Run drizzle-kit push to apply schema
  //    c. Sync products to providers
  //    d. Report results

  if (dryRun) {
    console.log(`\n📋 DRY RUN — no changes applied.`);
    console.log(`   Migrations: Would apply 0 new migrations`);
    console.log(`   Products:   Would sync 0 products`);
  } else {
    console.log(`\n📋 Push Summary:`);
    console.log(`   Migrations: 0 new (schema not yet implemented)`);
    console.log(`   Products:   0 synced`);
    console.log(`\n⚠️  Note: Database schema support requires @betterpay/drizzle-adapter.`);
    console.log(`   Install it with: pnpm add @betterpay/drizzle-adapter`);
  }
}

function findBillingFile(cwd: string): string | null {
  const candidates = ['billing.ts', 'billing.js', 'billing.mjs', 'src/billing.ts', 'src/billing.js'];
  for (const file of candidates) {
    if (existsSync(join(cwd, file))) return file;
  }
  return null;
}
