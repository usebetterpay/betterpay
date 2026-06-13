// ── betterpay credentials ─────────────────────────────────────────────────
// Manage encrypted provider credentials.
//
// Usage:
//   betterpay credentials list
//   betterpay credentials set <provider> [--key=value ...]
//   betterpay credentials get <provider>
//   betterpay credentials delete <provider>
//
// Requires:
//   DATABASE_URL  — PostgreSQL connection string
//   BETTERPAY_MASTER_KEY — Encryption key (min 32 chars)

import { validateMasterKey, DefaultCredentialStore } from '@betterpay/core';
import type { CredentialStore } from '@betterpay/core';

// ── Lazy DB connection ────────────────────────────────────────────────────

async function createDBCredentialStore(): Promise<CredentialStore> {
  const dbUrl = process.env.DATABASE_URL;
  const masterKey = process.env.BETTERPAY_MASTER_KEY;

  if (!dbUrl) {
    console.error('❌ DATABASE_URL is not set.');
    console.error('   Set it in your .env or environment:');
    console.error('   export DATABASE_URL=postgresql://user:pass@localhost:5432/mydb');
    process.exit(1);
  }

  if (!masterKey) {
    console.error('❌ BETTERPAY_MASTER_KEY is not set.');
    console.error('   Generate one with:');
    console.error('   node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
    process.exit(1);
  }

  const validation = validateMasterKey(masterKey);
  if (!validation.valid) {
    console.error('❌ BETTERPAY_MASTER_KEY is too weak:');
    for (const err of validation.errors) {
      console.error(`   - ${err}`);
    }
    process.exit(1);
  }

  // Dynamic import — drizzle-adapter + drivers are optional peer dependencies
  // All three may not be installed, so we use @ts-expect-error
  try {
    // @ts-expect-error — optional runtime dependency
    const drizzleMod = await import('drizzle-orm/postgres-js');
    // @ts-expect-error — optional runtime dependency
    const postgresMod = await import('postgres');
    // @ts-expect-error — optional runtime dependency
    const adapterMod = await import('@betterpay/drizzle-adapter');

    const sql = postgresMod.default(dbUrl);
    const db = drizzleMod.drizzle(sql);
    const repo = new adapterMod.DrizzleCredentialRepository(db);
    return new DefaultCredentialStore(repo, masterKey);
  } catch {
    console.error('❌ Could not connect to database.');
    console.error('   Make sure drizzle-orm, postgres, and @betterpay/drizzle-adapter are installed:');
    console.error('   pnpm add drizzle-orm postgres @betterpay/drizzle-adapter');
    process.exit(1);
  }
}

// ── Commands ──────────────────────────────────────────────────────────────

async function listCommand(): Promise<void> {
  const store = await createDBCredentialStore();
  const providers = await store.list();

  console.log('\n🔐 Stored Credentials\n');

  if (providers.length === 0) {
    console.log('   No credentials stored yet.\n');
    console.log('   Add credentials with:');
    console.log('   betterpay credentials set midtrans --server-key=SB-Mid-xxx\n');
    return;
  }

  for (const providerId of providers) {
    const creds = await store.get(providerId);
    if (creds) {
      const fields = Object.keys(creds);
      const masked = fields.map((f) => `${f}: ${maskValue(creds[f])}`);
      console.log(`   ✅ ${providerId}`);
      for (const m of masked) {
        console.log(`      ${m}`);
      }
    }
  }
  console.log('');
}

async function setCommand(args: string[]): Promise<void> {
  const providerId = args[0];
  if (!providerId) {
    console.error('❌ Provider ID required.');
    console.error('   Usage: betterpay credentials set <provider> [--key=value ...]');
    process.exit(1);
  }

  // Parse --key=value pairs
  const credentials: Record<string, string> = {};
  for (const arg of args.slice(1)) {
    if (arg.startsWith('--')) {
      const eqIdx = arg.indexOf('=');
      if (eqIdx === -1) {
        console.error(`❌ Invalid argument: ${arg}`);
        console.error('   Use --key=value format');
        process.exit(1);
      }
      const key = arg.slice(2, eqIdx);
      const value = arg.slice(eqIdx + 1);
      credentials[key] = value;
    }
  }

  if (Object.keys(credentials).length === 0) {
    console.error('❌ No credentials provided.');
    console.error('   Usage: betterpay credentials set midtrans --server-key=SB-Mid-xxx');
    process.exit(1);
  }

  const store = await createDBCredentialStore();
  await store.set(providerId, credentials);

  console.log(`\n✅ Credentials for "${providerId}" stored and encrypted.\n`);
  console.log('   Fields saved:');
  for (const key of Object.keys(credentials)) {
    console.log(`   - ${key}: ${maskValue(credentials[key])}`);
  }
  console.log('');
}

async function getCommand(args: string[]): Promise<void> {
  const providerId = args[0];
  if (!providerId) {
    console.error('❌ Provider ID required.');
    console.error('   Usage: betterpay credentials get <provider>');
    process.exit(1);
  }

  const store = await createDBCredentialStore();
  const creds = await store.get(providerId);

  if (!creds) {
    console.error(`❌ No credentials found for "${providerId}".`);
    process.exit(1);
  }

  console.log(`\n🔑 Credentials for "${providerId}"\n`);
  for (const [key, value] of Object.entries(creds)) {
    console.log(`   ${key}: ${value}`);
  }
  console.log('');
}

async function deleteCommand(args: string[]): Promise<void> {
  const providerId = args[0];
  if (!providerId) {
    console.error('❌ Provider ID required.');
    console.error('   Usage: betterpay credentials delete <provider>');
    process.exit(1);
  }

  const store = await createDBCredentialStore();
  const exists = await store.has(providerId);

  if (!exists) {
    console.error(`❌ No credentials found for "${providerId}".`);
    process.exit(1);
  }

  await store.delete(providerId);
  console.log(`\n✅ Credentials for "${providerId}" deleted.\n`);
}

// ── Helpers ───────────────────────────────────────────────────────────────

function maskValue(value: string): string {
  if (value.length <= 4) return '****';
  return value.slice(0, 4) + '*'.repeat(Math.min(value.length - 4, 16));
}

// ── Main entry ────────────────────────────────────────────────────────────

export async function credentialsCommand(args: string[]): Promise<void> {
  const subCommand = args[0];

  switch (subCommand) {
    case 'list':
      await listCommand();
      break;
    case 'set':
      await setCommand(args.slice(1));
      break;
    case 'get':
      await getCommand(args.slice(1));
      break;
    case 'delete':
    case 'remove':
      await deleteCommand(args.slice(1));
      break;
    default:
      console.log(`
🔐 BetterPay Credentials Manager

Usage: betterpay credentials <subcommand> [options]

Subcommands:
  list                    List all stored provider credentials (masked)
  set <provider> [--k=v]  Store encrypted credentials for a provider
  get <provider>          Show decrypted credentials for a provider
  delete <provider>       Remove stored credentials for a provider

Environment Variables:
  DATABASE_URL            PostgreSQL connection string
  BETTERPAY_MASTER_KEY    Encryption key (min 32 characters)

Examples:
  betterpay credentials list
  betterpay credentials set midtrans --server-key=SB-Mid-server-xxx
  betterpay credentials set xendit --api-key=xnd_dev_xxx --webhook-secret=whsec_xxx
  betterpay credentials get midtrans
  betterpay credentials delete midtrans
`);
      break;
  }
}
