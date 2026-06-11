// ── Drizzle Adapter Types ────────────────────────────────────────────────
// Shared types for repository implementations.
// These mirror the types from @betterpay/core and @betterpay/billing.

// ── Transaction types (from core) ────────────────────────────────────────

export type TransactionStatus =
  | 'pending'
  | 'active'
  | 'completed'
  | 'expired'
  | 'canceled'
  | 'failed';

export interface TransactionRecord {
  id: string;
  orderId: string;
  providerId: string;
  status: TransactionStatus;
  amount: number;
  currency: string;
  customerEmail: string;
  metadata: Record<string, string> | null;
  providerTransactionId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ── Subscription types (from billing) ────────────────────────────────────

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

// ── Entitlement types (from billing) ─────────────────────────────────────

export interface EntitlementRecord {
  id: string;
  customerId: string;
  featureId: string;
  subscriptionId: string;
  limit: number | null;
  used: number;
  nextResetAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// ── Customer types (from billing) ────────────────────────────────────────

export interface CustomerRecord {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  metadata?: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

// ── Invoice types (from billing) ─────────────────────────────────────────

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
