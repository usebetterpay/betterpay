// ── @betterpay/billing — Plugin factory + public exports ─────────────────

import type { BetterPayPlugin } from '@betterpay/core';
import type { BillingPluginData } from '@betterpay/core';
import type { PlanDefinition } from './types';
import { normalizeSchema, type NormalizedSchema } from './normalize';
import { SubscriptionService } from './subscription';
import { EntitlementService } from './entitlement';
import { CustomerService } from './customer';
import { InvoiceService } from './invoice';
import { BillingCycleRunner } from './billing-cycle';
import {
  createInMemorySubscriptionRepo,
  createInMemoryEntitlementRepo,
  createInMemoryCustomerRepo,
  createInMemoryInvoiceRepo,
} from './in-memory-repos';

// ── Re-exports ───────────────────────────────────────────────────────────

export { feature, plan, isFeature, isPlan } from './schema';

export type {
  FeatureType, MeteredResetInterval, FeatureDefinition, MeteredFeatureConfig,
  FeatureInclude, FeatureFactory, PlanPrice, PlanDefinition,
  SubscriptionStatus, SubscriptionRecord,
  EntitlementRecord, EntitlementBalance, CheckResult, ReportResult,
  CustomerRecord, InvoiceStatus, InvoiceRecord, ProductRecord,
} from './types';

export { normalizeSchema, computePlanHash, planChanged, featuresChanged } from './normalize';
export type { NormalizedSchema, NormalizedPlan } from './normalize';

export { SubscriptionService } from './subscription';
export type { SubscriptionRepository } from './subscription';
export { isValidSubscriptionTransition, VALID_SUBSCRIPTION_TRANSITIONS } from './subscription';

export { CustomerService } from './customer';
export type { CustomerRepository } from './customer';

export { EntitlementService, computeNextResetAt } from './entitlement';
export type { EntitlementRepository } from './entitlement';

export { InvoiceService } from './invoice';
export type { InvoiceRepository } from './invoice';

export { BillingCycleRunner } from './billing-cycle';
export type { BillingCycleResult, BillingCycleDeps } from './billing-cycle';

export { TestClock, testClock } from './test-clock';
export type { TestClockConfig } from './test-clock';

// Dunning
export {
  DunningManager,
  createDunningManager,
} from './dunning/dunning-manager';
export type {
  DunningConfig,
  DunningState,
  DunningStage,
  DunningEvent,
} from './dunning/dunning-manager';

// Cron
export {
  CronEndpoint,
  createCronEndpoint,
  createCronHandler,
  generateCronTemplates,
} from './cron/cron-endpoint';
export type {
  CronConfig,
  CronRequest,
  CronResponse,
} from './cron/cron-endpoint';

// ── Plugin factory ───────────────────────────────────────────────────────

export interface BillingPluginOptions {
  /** Plan definitions created with plan() and feature(). */
  products: PlanDefinition[];
}

/**
 * Create a billing plugin for BetterPay.
 *
 * Creates in-memory repos + service instances and wires them into
 * plugin.$Infer.billing so the core factory can use them.
 *
 * @example
 * ```ts
 * import { billing, feature, plan } from "@betterpay/billing";
 *
 * const messages = feature({ id: "messages", type: "metered" });
 * const free = plan({ id: "free", group: "base", default: true,
 *   includes: [messages({ limit: 100, reset: "month" })] });
 * const pro = plan({ id: "pro", group: "base",
 *   price: { amount: 199000, currency: "IDR", interval: "month" },
 *   includes: [messages({ limit: 5000, reset: "month" })] });
 *
 * const pay = betterPay({
 *   plugins: [midtrans({ ... }), billing({ products: [free, pro] })],
 * });
 *
 * // Now available:
 * pay.billing.subscribe({ customerId: "cust_1", planId: "pro" })
 * pay.billing.check({ customerId: "cust_1", featureId: "messages" })
 * pay.billing.report({ customerId: "cust_1", featureId: "messages", amount: 1 })
 * ```
 */
export function billing(options: BillingPluginOptions): BetterPayPlugin {
  const schema: NormalizedSchema = normalizeSchema(options.products);

  // Create repos + services
  const subRepo = createInMemorySubscriptionRepo();
  const entRepo = createInMemoryEntitlementRepo();
  const custRepo = createInMemoryCustomerRepo();
  const invRepo = createInMemoryInvoiceRepo();

  const subService = new SubscriptionService(subRepo);
  const entService = new EntitlementService(entRepo);
  const custService = new CustomerService(custRepo);
  const invService = new InvoiceService(invRepo);

  // Billing cycle runner — needs external deps wired later
  // We create a lazy wrapper that the core factory fills in
  let billingCycleRunner: BillingCycleRunner | null = null;

  const billingData: BillingPluginData = {
    products: options.products as unknown as BillingPluginData['products'],
    schema: schema as unknown as BillingPluginData['schema'],
    subscription: subService as unknown as BillingPluginData['subscription'],
    entitlement: entService as unknown as BillingPluginData['entitlement'],
    customer: custService as unknown as BillingPluginData['customer'],
    invoice: invService as unknown as BillingPluginData['invoice'],
    billingCycle: {
      async run(now?: Date) {
        if (!billingCycleRunner) {
          return { processed: 0, succeeded: 0, failed: 0, errors: ['Billing cycle runner not initialized'] };
        }
        return billingCycleRunner.run(now);
      },
    },
  };

  // Store a setter so core can inject the runner once provider registry is ready
  (billingData as any).__setRunner = (runner: BillingCycleRunner) => {
    billingCycleRunner = runner;
  };

  // Also expose services directly for advanced users
  (billingData as any).__services = {
    subscription: subService,
    entitlement: entService,
    customer: custService,
    invoice: invService,
    repos: { subRepo, entRepo, custRepo, invRepo },
  };

  return {
    id: 'billing',
    version: '0.1.0',
    $Infer: {
      billing: billingData,
      schema,
      products: options.products,
    },
    endpoints: {},
    hooks: { before: [], after: [] },
    $ERROR_CODES: {
      BILLING_SUBSCRIBE_ERROR: { code: 'BILLING_SUBSCRIBE_ERROR', message: 'Failed to create subscription' },
      BILLING_ENTITLEMENT_ERROR: { code: 'BILLING_ENTITLEMENT_ERROR', message: 'Entitlement check failed' },
      BILLING_CYCLE_ERROR: { code: 'BILLING_CYCLE_ERROR', message: 'Billing cycle processing failed' },
    },
  };
}
