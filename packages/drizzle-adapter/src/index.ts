// ── @betterpay/drizzle-adapter — Public exports ──────────────────────────
//
// Usage:
// ```ts
// import { drizzle } from "drizzle-orm/node-postgres";
// import { createDrizzleRepositories } from "@betterpay/drizzle-adapter";
// import * as schema from "@betterpay/drizzle-adapter/schema";
//
// const db = drizzle(pool, { schema });
// const repos = createDrizzleRepositories(db);
//
// const pay = betterPay({
//   transactionRepository: repos.transaction,
//   plugins: [...],
// });
// ```

export * from './schema';

/**
 * Create Drizzle-backed repositories for all BetterPay services.
 * Returns repository implementations matching the interfaces in @betterpay/core
 * and @betterpay/billing.
 */
export function createDrizzleRepositories(_db: unknown) {
  // Full repository implementations require drizzle-orm queries.
  // This is a scaffolding that defines the schema + export interface.
  // Actual query implementations will be added when a real PG connection is available.
  return {
    // Transaction repository (for @betterpay/core)
    transaction: {
      async createTransaction(_data: unknown) { throw new Error('Drizzle adapter: connect a PG database first'); },
      async getTransactionByOrderId(_orderId: string) { throw new Error('Drizzle adapter: connect a PG database first'); },
      async updateStatus(_orderId: string, _status: string, _providerTransactionId?: string) { throw new Error('Drizzle adapter: connect a PG database first'); },
      async checkIdempotencyKey(_key: string) { throw new Error('Drizzle adapter: connect a PG database first'); },
      async setIdempotencyKey(_key: string, _transactionId: string) { throw new Error('Drizzle adapter: connect a PG database first'); },
    },
    // Subscription repository (for @betterpay/billing)
    subscription: {
      async create(_data: unknown) { throw new Error('Drizzle adapter: connect a PG database first'); },
      async getById(_id: string) { throw new Error('Drizzle adapter: connect a PG database first'); },
      async getActiveByCustomerAndGroup(_customerId: string, _group: string) { throw new Error('Drizzle adapter: connect a PG database first'); },
      async getScheduledByCustomerAndGroup(_customerId: string, _group: string) { throw new Error('Drizzle adapter: connect a PG database first'); },
      async update(_id: string, _data: unknown) { throw new Error('Drizzle adapter: connect a PG database first'); },
      async cancel(_id: string) { throw new Error('Drizzle adapter: connect a PG database first'); },
    },
    // Customer repository (for @betterpay/billing)
    customer: {
      async create(_data: unknown) { throw new Error('Drizzle adapter: connect a PG database first'); },
      async getById(_id: string) { throw new Error('Drizzle adapter: connect a PG database first'); },
      async getByEmail(_email: string) { throw new Error('Drizzle adapter: connect a PG database first'); },
      async update(_id: string, _data: unknown) { throw new Error('Drizzle adapter: connect a PG database first'); },
      async delete(_id: string) { throw new Error('Drizzle adapter: connect a PG database first'); },
      async list(_limit: number, _offset: number) { throw new Error('Drizzle adapter: connect a PG database first'); },
    },
    // Entitlement repository (for @betterpay/billing)
    entitlement: {
      async create(_data: unknown) { throw new Error('Drizzle adapter: connect a PG database first'); },
      async getByCustomerAndFeature(_customerId: string, _featureId: string) { throw new Error('Drizzle adapter: connect a PG database first'); },
      async deduct(_id: string, _amount: number) { throw new Error('Drizzle adapter: connect a PG database first'); },
      async resetIfNeeded(_id: string, _now: Date) { throw new Error('Drizzle adapter: connect a PG database first'); },
      async deleteBySubscription(_subscriptionId: string) { throw new Error('Drizzle adapter: connect a PG database first'); },
    },
    // Invoice repository (for @betterpay/billing)
    invoice: {
      async create(_data: unknown) { throw new Error('Drizzle adapter: connect a PG database first'); },
      async getById(_id: string) { throw new Error('Drizzle adapter: connect a PG database first'); },
      async getBySubscription(_subscriptionId: string) { throw new Error('Drizzle adapter: connect a PG database first'); },
      async updateStatus(_id: string, _status: string, _paidAt?: Date) { throw new Error('Drizzle adapter: connect a PG database first'); },
      async getOverdue(_now: Date) { throw new Error('Drizzle adapter: connect a PG database first'); },
    },
  };
}
