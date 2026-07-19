// ── betterpay push ───────────────────────────────────────────────────────
// Apply BetterPay SQL migrations via MigrationRunner.

import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { createMigrationRunner } from '@betterpay/core';

const require = createRequire(import.meta.url);

export async function pushCommand(args: string[]): Promise<void> {
  const cwd = args.find((a) => !a.startsWith('-')) ?? process.cwd();
  const dryRun = args.includes('--dry-run');

  console.log(`🔧 BetterPay Push${dryRun ? ' (DRY RUN)' : ''}`);
  console.log(`   Working directory: ${cwd}\n`);

  const billingFile = findBillingFile(cwd);
  if (!billingFile) {
    console.error(`❌ No billing.ts or billing.js found in ${cwd}`);
    console.error(`   Run 'betterpay init' first.`);
    process.exit(1);
  }
  console.log(`   ✅ Found billing config: ${billingFile}`);

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error(`❌ DATABASE_URL not set`);
    console.error(`   Set it in .env or environment variables.`);
    process.exit(1);
  }
  console.log(`   ✅ Database URL configured`);

  const migrationsPath = resolveMigrationsPath();
  if (!migrationsPath) {
    console.error(`❌ Could not locate BetterPay SQL migrations.`);
    console.error(`   Install @betterpay/drizzle-adapter next to the CLI, or set BETTERPAY_MIGRATIONS_PATH.`);
    process.exit(1);
  }
  console.log(`   ✅ Migrations path: ${migrationsPath}`);

  const runner = createMigrationRunner({
    databaseUrl: dbUrl,
    migrationsPath,
  });

  try {
    if (dryRun) {
      const result = await runner.dryRun();
      const pending = result.applied ?? [];
      if (pending.length === 0) {
        console.log(`\n✅ No pending migrations.`);
      } else {
        console.log(`\n📋 Would apply ${pending.length} migration(s):`);
        for (const name of pending) {
          console.log(`   - ${name}`);
        }
      }
      await runner.disconnect();
      return;
    }

    const result = await runner.migrate();
    if (result.failed) {
      console.error(`\n❌ Migration failed: ${result.failed.migration}`);
      console.error(`   ${result.failed.error}`);
      if (result.applied.length > 0) {
        console.error(`   Already applied this run: ${result.applied.join(', ')}`);
      }
      await runner.disconnect();
      process.exit(1);
    }

    if (result.applied.length === 0) {
      console.log(`\n✅ Database already up to date.`);
    } else {
      console.log(`\n✅ Applied ${result.applied.length} migration(s):`);
      for (const name of result.applied) {
        console.log(`   - ${name}`);
      }
    }
    console.log(`\n   Note: product sync to payment providers is not part of push yet.`);
    await runner.disconnect();
  } catch (err) {
    console.error(`\n❌ Push failed: ${(err as Error).message}`);
    try {
      await runner.disconnect();
    } catch {
      /* ignore */
    }
    process.exit(1);
  }
}

function findBillingFile(cwd: string): string | null {
  const candidates = ['billing.ts', 'billing.js', 'billing.mjs', 'src/billing.ts', 'src/billing.js'];
  for (const file of candidates) {
    if (existsSync(join(cwd, file))) return file;
  }
  return null;
}

/**
 * Resolve path to SQL migrations shipped with @betterpay/drizzle-adapter.
 */
export function resolveMigrationsPath(): string | null {
  if (process.env.BETTERPAY_MIGRATIONS_PATH) {
    const p = process.env.BETTERPAY_MIGRATIONS_PATH;
    return existsSync(p) ? p : null;
  }

  // 1) require.resolve package root
  try {
    const pkgJson = require.resolve('@betterpay/drizzle-adapter/package.json');
    const root = dirname(pkgJson);
    const candidate = join(root, 'migrations');
    if (existsSync(candidate)) return candidate;
  } catch {
    /* not installed adjacent */
  }

  // 2) monorepo: cli → ../drizzle-adapter/migrations
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    const monorepo = join(here, '..', '..', '..', 'drizzle-adapter', 'migrations');
    if (existsSync(monorepo)) return monorepo;
  } catch {
    /* ignore */
  }

  return null;
}
