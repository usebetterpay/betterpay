// ── @betterpay/billing — Plugin factory + public exports ─────────────────

import type { BetterPayPlugin } from '@betterpay/core';
import type { BillingPluginData } from '@betterpay/core';
import type { PlanDefinition } from './types';
import { normalizeSchema, type NormalizedSchema } from './normalize';
import { SubscriptionService, type SubscriptionRepository } from './subscription';
import { EntitlementService, type EntitlementRepository } from './entitlement';
import { CustomerService, type CustomerRepository } from './customer';
import { InvoiceService, type InvoiceRepository } from './invoice';
import { BillingCycleRunner } from './billing-cycle';
import { DunningService } from './dunning/dunning-service';
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
export { DunningService } from './dunning/dunning-service';
export type { DunningCallbacks } from './dunning/dunning-service';

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

export interface BillingRepositories {
  subscription: SubscriptionRepository;
  entitlement: EntitlementRepository;
  customer: CustomerRepository;
  invoice: InvoiceRepository;
}

export interface BillingPluginOptions {
  /** Plan definitions created with plan() and feature(). */
  products: PlanDefinition[];
  /**
   * Optional durable repositories (e.g. from @betterpay/drizzle-adapter).
   * When omitted, in-memory repos are used (dev/test only).
   * When provided, those repos are used exclusively — no silent mix.
   */
  repositories?: BillingRepositories;
}

/**
 * Create a billing plugin for BetterPay.
 *
 * Creates service instances from injected or in-memory repos and wires them
 * into plugin.$Infer.billing so the core factory can use them.
 *
 * @example
 * ```ts
 * import { billing, feature, plan } from "@betterpay/billing";
 * import { createDrizzleRepositories } from "@betterpay/drizzle-adapter";
 *
 * const messages = feature({ id: "messages", type: "metered" });
 * const free = plan({ id: "free", group: "base", default: true,
 *   includes: [messages({ limit: 100, reset: "month" })] });
 * const pro = plan({ id: "pro", group: "base",
 *   price: { amount: 199000, currency: "IDR", interval: "month" },
 *   includes: [messages({ limit: 5000, reset: "month" })] });
 *
 * // Dev (in-memory):
 * billing({ products: [free, pro] })
 *
 * // Production (durable):
 * const repos = createDrizzleRepositories(db);
 * billing({
 *   products: [free, pro],
 *   repositories: {
 *     subscription: repos.subscription,
 *     entitlement: repos.entitlement,
 *     customer: repos.customer,
 *     invoice: repos.invoice,
 *   },
 * })
 * ```
 */
export function billing(options: BillingPluginOptions): BetterPayPlugin {
  const schema: NormalizedSchema = normalizeSchema(options.products);

  const usesInMemory = !options.repositories;
  const subRepo = options.repositories?.subscription ?? createInMemorySubscriptionRepo();
  const entRepo = options.repositories?.entitlement ?? createInMemoryEntitlementRepo();
  const custRepo = options.repositories?.customer ?? createInMemoryCustomerRepo();
  const invRepo = options.repositories?.invoice ?? createInMemoryInvoiceRepo();

  const subService = new SubscriptionService(subRepo);
  const entService = new EntitlementService(entRepo);
  const custService = new CustomerService(custRepo);
  const invService = new InvoiceService(invRepo);
  const dunningService = new DunningService(subRepo);

  // Billing cycle runner — core wires createPayment via __wireBillingCycle
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
          return {
            processed: 0,
            succeeded: 0,
            failed: 0,
            errors: ['Billing cycle runner not initialized — core must call __wireBillingCycle'],
          };
        }
        try {
          await dunningService.processDue(now ?? new Date());
        } catch {
          /* best-effort dunning advance */
        }
        return billingCycleRunner.run(now);
      },
    },
  };

  /** @internal Core factory: wire payment + complete BillingCycleRunner. */
  (billingData as any).__wireBillingCycle = (deps: {
    createPaymentForSubscription: (
      sub: { id: string; customerId: string; planId: string },
      plan: PlanDefinition,
    ) => Promise<{ paymentUrl: string; providerTransactionId: string }>;
    onPaymentFailure?: (subscriptionId: string) => Promise<void>;
  }) => {
    const planMap = new Map(options.products.map((p) => [p.id, p]));

    billingCycleRunner = new BillingCycleRunner({
      subscriptionService: subService,
      updateSubscriptionPeriod: async (id, periodStart, periodEnd) => {
        await subRepo.update(id, {
          currentPeriodStartAt: periodStart,
          currentPeriodEndAt: periodEnd,
        });
      },
      invoiceService: invService,
      entitlementService: entService,
      planMap,
      findDueSubscriptions: async (before) => {
        if (subRepo.listDue) return subRepo.listDue(before);
        return [];
      },
      createPaymentForSubscription: async (sub, plan) => {
        try {
          return await deps.createPaymentForSubscription(sub, plan);
        } catch (err) {
          try {
            await dunningService.onPaymentFailure(sub.id);
          } catch {
            try {
              await subService.markPastDue(sub.id);
            } catch {
              /* best-effort */
            }
          }
          await deps.onPaymentFailure?.(sub.id);
          throw err;
        }
      },
    });
  };

  // Legacy setter (tests / advanced)
  (billingData as any).__setRunner = (runner: BillingCycleRunner) => {
    billingCycleRunner = runner;
  };

  (billingData as any).__services = {
    subscription: subService,
    entitlement: entService,
    customer: custService,
    invoice: invService,
    dunning: dunningService,
    repos: { subRepo, entRepo, custRepo, invRepo },
  };

  (billingData as any).dunning = dunningService;

  return {
    id: 'billing',
    version: '0.1.0',
    $Infer: {
      billing: billingData,
      schema,
      products: options.products,
      /** True when default in-memory repos are in use (not for production). */
      billingUsesInMemory: usesInMemory,
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
