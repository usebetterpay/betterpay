#!/usr/bin/env node
// ── @betterpay/cli — Entry point ─────────────────────────────────────────

import { initCommand } from './commands/init.js';
import { pushCommand } from './commands/push.js';
import { statusCommand } from './commands/status.js';
import { credentialsCommand } from './commands/credentials.js';

const args = process.argv.slice(2);
const command = args[0];

async function main() {
  switch (command) {
    case 'init':
      await initCommand(args.slice(1));
      break;
    case 'push':
      await pushCommand(args.slice(1));
      break;
    case 'status':
      await statusCommand(args.slice(1));
      break;
    case 'credentials':
      await credentialsCommand(args.slice(1));
      break;
    case '--help':
    case '-h':
    case undefined:
      printHelp();
      break;
    default:
      console.error(`Unknown command: ${command}`);
      printHelp();
      process.exit(1);
  }
}

function printHelp() {
  console.log(`
BetterPay CLI v0.1.0

Usage: betterpay <command> [options]

Commands:
  init          Initialize BetterPay in your project (detect framework, generate config)
  push          Apply database migrations and sync products (required in production)
  status        Check current BetterPay configuration and migration status
  credentials   Manage encrypted provider credentials (set/get/list/delete)

Options:
  -h, --help  Show this help message
`);
}

main().catch((error) => {
  console.error('Error:', (error as Error).message);
  process.exit(1);
});
