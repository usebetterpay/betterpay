// ── @betterpay/drizzle-adapter — Drizzle ORM adapter ─────────────────────
//
// Provides PostgreSQL-backed repositories for all BetterPay tables.
//
// Usage:
//   import { drizzle } from "drizzle-orm/node-postgres";
//   import { createDrizzleRepositories } from "@betterpay/drizzle-adapter";
//   import { betterPay } from "@betterpay/core";
//   import { billing } from "@betterpay/billing";
//   import pg from "pg";
//
//   const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
//   const db = drizzle(pool);
//   const repos = createDrizzleRepositories(db);
//
//   const pay = betterPay({
//     transactionRepository: repos.transaction,
//     webhookEventRepository: repos.webhookEvent,
//     plugins: [
//       midtrans({ ... }),
//       billing({
//         products: [...],
//         repositories: {
//           subscription: repos.subscription,
//           entitlement: repos.entitlement,
//           customer: repos.customer,
//           invoice: repos.invoice,
//         },
//       }),
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
import { createDrizzleWebhookEventRepo } from './repos/webhook-event';
import { DrizzleCredentialRepository } from './repos/credential';
export { DrizzleCredentialRepository } from './repos/credential';
export { createDrizzleWebhookEventRepo, createMapWebhookEventRepo } from './repos/webhook-event';
export { toSubscriptionRecord, toCustomerRecord } from './mappers';

type DrizzleDB = any;

/**
 * Create all Drizzle-backed repositories.
 * Pass transaction + webhookEvent to betterPay(); pass billing bag to billing().
 */
export function createDrizzleRepositories(db: DrizzleDB) {
  return {
    transaction: createDrizzleTransactionRepo(db),
    webhookEvent: createDrizzleWebhookEventRepo(db),
    subscription: createDrizzleSubscriptionRepo(db),
    entitlement: createDrizzleEntitlementRepo(db),
    customer: createDrizzleCustomerRepo(db),
    invoice: createDrizzleInvoiceRepo(db),
    credential: new DrizzleCredentialRepository(db),
  };
}
