// ── Billing domain types ─────────────────────────────────────────────────

// ── Feature types ────────────────────────────────────────────────────────
export type FeatureType = 'boolean' | 'metered';
export type MeteredResetInterval = 'day' | 'week' | 'month' | 'year';

export interface FeatureDefinition {
  id: string;
  type: FeatureType;
}

export interface MeteredFeatureConfig {
  limit: number;
  reset: MeteredResetInterval;
}

export interface FeatureInclude {
  featureId: string;
  type: FeatureType;
  metered?: MeteredFeatureConfig;
}

// Brand symbol for features only (plans use shape detection)
const FEATURE_BRAND = Symbol.for('betterpay.feature');

// ── Feature factory return type ──────────────────────────────────────────
export interface FeatureFactory {
  readonly id: string;
  readonly type: FeatureType;
  readonly [FEATURE_BRAND]: true;
  (config?: MeteredFeatureConfig): FeatureInclude;
}

// ── Plan types ───────────────────────────────────────────────────────────
export interface PlanPrice {
  amount: number;
  currency: string;
  interval?: 'month' | 'year' | 'one_time';
}

export interface PlanDefinition {
  id: string;
  group: string;
  name: string;
  price?: PlanPrice;
  default?: boolean;
  includes: FeatureInclude[];
}

// ── Subscription states ──────────────────────────────────────────────────
export type SubscriptionStatus =
  | 'scheduled'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'ended';

export interface SubscriptionRecord {
  id: string;
  customerId: string;
  planId: string;
  group: string;
  status: SubscriptionStatus;
  cancelAtPeriodEnd: boolean;
  currentPeriodStartAt: Date | null;
  currentPeriodEndAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// ── Entitlement ──────────────────────────────────────────────────────────
export interface EntitlementRecord {
  id: string;
  customerId: string;
  featureId: string;
  subscriptionId: string;
  limit: number | null; // null = unlimited
  used: number;
  nextResetAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface EntitlementBalance {
  featureId: string;
  limit: number | null;
  remaining: number | null;
  resetAt: Date | null;
  unlimited: boolean;
}

export interface CheckResult {
  allowed: boolean;
  balance: EntitlementBalance;
}

export interface ReportResult {
  success: boolean;
  balance: EntitlementBalance;
}

// ── Customer ─────────────────────────────────────────────────────────────
export interface CustomerRecord {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  metadata?: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

// ── Invoice ──────────────────────────────────────────────────────────────
export type InvoiceStatus = 'draft' | 'open' | 'paid' | 'overdue' | 'void';

export interface InvoiceRecord {
  id: string;
  customerId: string;
  subscriptionId: string;
  planId: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  dueAt: Date;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// ── Product (normalized plan stored in DB) ───────────────────────────────
export interface ProductRecord {
  id: string;
  planId: string;
  name: string;
  group: string;
  isDefault: boolean;
  priceAmount: number | null;
  priceCurrency: string | null;
  priceInterval: string | null;
  version: number;
  hash: string;
  features: FeatureInclude[];
  createdAt: Date;
  updatedAt: Date;
}
