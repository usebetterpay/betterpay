// ── Billing bridge types ─────────────────────────────────────────────────
// Core doesn't depend on @betterpay/billing directly.
// The billing plugin stores its services in plugin.$Infer.billing.
// These interfaces define the structural contract.

export interface BillingFeatureInclude {
  featureId: string;
  type: string;
  metered?: { limit: number; reset: string };
}

export interface BillingPlanDef {
  id: string;
  group: string;
  name: string;
  price?: { amount: number; currency: string; interval?: string };
  default?: boolean;
  includes: BillingFeatureInclude[];
}

export interface BillingNormalizedPlan {
  id: string;
  group: string;
  name: string;
  isDefault: boolean;
  priceAmount: number | null;
  priceCurrency: string | null;
  priceInterval: string | null;
  features: BillingFeatureInclude[];
  hash: string;
}

// ── Service handles (structural, any-cast safe) ──────────────────────────

export interface BillingSubscriptionHandle {
  subscribe(input: { customerId: string; plan: BillingPlanDef; periodStart?: Date; periodEnd?: Date }): Promise<unknown>;
  activate(id: string, periodStart: Date, periodEnd: Date): Promise<unknown>;
  cancel(id: string, atPeriodEnd?: boolean): Promise<unknown>;
  upgrade(input: { currentSubscriptionId: string; newPlan: BillingPlanDef }): Promise<unknown>;
  downgrade(input: { currentSubscriptionId: string; newPlan: BillingPlanDef }): Promise<unknown>;
  getActive(customerId: string, group: string): Promise<unknown>;
}

export interface BillingEntitlementHandle {
  createEntitlements(customerId: string, subscriptionId: string, features: BillingFeatureInclude[]): Promise<void>;
  check(customerId: string, featureId: string): Promise<{ allowed: boolean; balance: unknown }>;
  report(customerId: string, featureId: string, amount: number): Promise<{ success: boolean; balance: unknown }>;
  removeBySubscription(subscriptionId: string): Promise<void>;
}

export interface BillingCustomerHandle {
  create(data: { email: string; name?: string; phone?: string; metadata?: Record<string, string> }): Promise<unknown>;
  getById(id: string): Promise<unknown>;
  getByEmail(email: string): Promise<unknown>;
  getOrCreate(email: string, name?: string): Promise<unknown>;
  delete(id: string): Promise<void>;
}

export interface BillingInvoiceHandle {
  create(data: { customerId: string; subscriptionId: string; planId: string; amount: number; currency: string; dueAt: Date }): Promise<unknown>;
  getBySubscription(subscriptionId: string): Promise<unknown[]>;
  markPaid(id: string, paidAt?: Date): Promise<unknown>;
}

export interface BillingCycleHandle {
  run(now?: Date): Promise<{ processed: number; succeeded: number; failed: number; errors: unknown[] }>;
}

export interface BillingPluginData {
  products: BillingPlanDef[];
  schema: { plans: BillingNormalizedPlan[]; planMap: Map<string, BillingNormalizedPlan> };
  subscription: BillingSubscriptionHandle;
  entitlement: BillingEntitlementHandle;
  customer: BillingCustomerHandle;
  invoice: BillingInvoiceHandle;
  billingCycle: BillingCycleHandle;
}
