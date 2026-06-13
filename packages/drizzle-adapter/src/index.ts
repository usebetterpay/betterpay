// ── @betterpay/drizzle-adapter — Drizzle ORM adapter ─────────────────────
//
// Provides PostgreSQL-backed repositories for all BetterPay tables.
//
// Usage:
//   import { drizzle } from "drizzle-orm/node-postgres";
//   import { createDrizzleRepositories } from "@betterpay/drizzle-adapter";
//   import * as schema from "@betterpay/drizzle-adapter/schema";
//   import pg from "pg";
//
//   const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
//   const db = drizzle(pool, { schema });
//   const repos = createDrizzleRepositories(db);
//
//   const pay = betterPay({
//     transactionRepository: repos.transaction,
//     plugins: [
//       midtrans({ ... }),
//       billing({ products: [...], repos: repos }),
//     ],
//   });

// Schema exports
export * from './schema';

// Type exports
export type {
  TransactionRecord,
  TransactionStatus,
  SubscriptionRecord,
  SubscriptionStatus,
  EntitlementRecord,
  CustomerRecord,
  InvoiceRecord,
  InvoiceStatus,
} from './types';

// Repository imports
import { createDrizzleTransactionRepo } from './repos/transaction';
import { createDrizzleSubscriptionRepo } from './repos/subscription';
import { createDrizzleEntitlementRepo } from './repos/entitlement';
import { createDrizzleCustomerRepo } from './repos/customer';
import { createDrizzleInvoiceRepo } from './repos/invoice';
import { DrizzleCredentialRepository } from './repos/credential';
export { DrizzleCredentialRepository } from './repos/credential';

type DrizzleDB = any;

/**
 * Create all Drizzle-backed repositories.
 * Pass these to betterPay() and billing() for PostgreSQL persistence.
 */
export function createDrizzleRepositories(db: DrizzleDB) {
  return {
    transaction: createDrizzleTransactionRepo(db),
    subscription: createDrizzleSubscriptionRepo(db),
    entitlement: createDrizzleEntitlementRepo(db),
    customer: createDrizzleCustomerRepo(db),
    invoice: createDrizzleInvoiceRepo(db),
    credential: new DrizzleCredentialRepository(db),
  };
}
