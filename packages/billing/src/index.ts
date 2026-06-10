// ── @betterpay/billing — Plugin factory + public exports ─────────────────

import type { BetterPayPlugin } from '@betterpay/core';
import type { PlanDefinition } from './types';
import { normalizeSchema, type NormalizedSchema } from './normalize';

// ── Re-exports ───────────────────────────────────────────────────────────

// Schema DSL
export { feature, plan, isFeature, isPlan } from './schema';

// Types
export type {
  FeatureType,
  MeteredResetInterval,
  FeatureDefinition,
  MeteredFeatureConfig,
  FeatureInclude,
  FeatureFactory,
  PlanPrice,
  PlanDefinition,
  SubscriptionStatus,
  SubscriptionRecord,
  EntitlementRecord,
  EntitlementBalance,
  CheckResult,
  ReportResult,
  CustomerRecord,
  InvoiceStatus,
  InvoiceRecord,
  ProductRecord,
} from './types';

// Normalization
export { normalizeSchema, computePlanHash, planChanged, featuresChanged } from './normalize';
export type { NormalizedSchema, NormalizedPlan } from './normalize';

// Subscription
export { SubscriptionService } from './subscription';
export type { SubscriptionRepository } from './subscription';
export { isValidSubscriptionTransition, VALID_SUBSCRIPTION_TRANSITIONS } from './subscription';

// Customer
export { CustomerService } from './customer';
export type { CustomerRepository } from './customer';

// Entitlement
export { EntitlementService, computeNextResetAt } from './entitlement';
export type { EntitlementRepository } from './entitlement';

// Invoice
export { InvoiceService } from './invoice';
export type { InvoiceRepository } from './invoice';

// Billing cycle
export { BillingCycleRunner } from './billing-cycle';
export type { BillingCycleResult, BillingCycleDeps } from './billing-cycle';

// ── Plugin factory ───────────────────────────────────────────────────────

export interface BillingPluginOptions {
  /** Plan definitions created with plan() and feature(). */
  products: PlanDefinition[];
}

/**
 * Create a billing plugin for BetterPay.
 *
 * @example
 * ```ts
 * import { billing, feature, plan } from "@betterpay/billing";
 *
 * const messages = feature({ id: "messages", type: "metered" });
 *
 * const free = plan({ id: "free", group: "base", default: true,
 *   includes: [messages({ limit: 100, reset: "month" })],
 * });
 *
 * const pro = plan({ id: "pro", group: "base",
 *   price: { amount: 199000, currency: "IDR", interval: "month" },
 *   includes: [messages({ limit: 5000, reset: "month" })],
 * });
 *
 * const pay = betterPay({
 *   plugins: [
 *     midtrans({ ... }),
 *     billing({ products: [free, pro] }),
 *   ],
 * });
 * ```
 */
export function billing(options: BillingPluginOptions): BetterPayPlugin {
  const schema: NormalizedSchema = normalizeSchema(options.products);

  return {
    id: 'billing',
    version: '0.1.0',

    // Store normalized schema as plugin metadata
    $Infer: {
      schema,
      products: options.products,
    },

    endpoints: {},

    hooks: {
      before: [],
      after: [],
    },

    $ERROR_CODES: {
      BILLING_SUBSCRIBE_ERROR: {
        code: 'BILLING_SUBSCRIBE_ERROR',
        message: 'Failed to create subscription',
      },
      BILLING_ENTITLEMENT_ERROR: {
        code: 'BILLING_ENTITLEMENT_ERROR',
        message: 'Entitlement check failed',
      },
      BILLING_CYCLE_ERROR: {
        code: 'BILLING_CYCLE_ERROR',
        message: 'Billing cycle processing failed',
      },
    },
  };
}
