// ── @betterpay/drizzle-adapter — Drizzle ORM schema + repository impl ────
// Provides PostgreSQL-backed repositories for all billing + payment tables.
// Uses drizzle-orm with pg driver.

import {
  pgTable,
  text,
  integer,
  bigint,
  boolean,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';

// ── Core billing tables ──────────────────────────────────────────────────

export const betterpayCustomer = pgTable('betterpay_customer', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  name: text('name'),
  phone: text('phone'),
  metadata: jsonb('metadata').$type<Record<string, string>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('betterpay_customer_email_idx').on(table.email),
]);

export const betterpayProduct = pgTable('betterpay_product', {
  id: text('id').primaryKey(),
  planId: text('plan_id').notNull(),
  name: text('name').notNull(),
  groupId: text('group_id').notNull(),
  isDefault: boolean('is_default').notNull().default(false),
  priceAmount: bigint('price_amount', { mode: 'number' }),
  priceCurrency: text('price_currency'),
  priceInterval: text('price_interval'),
  version: integer('version').notNull().default(1),
  hash: text('hash').notNull(),
  features: jsonb('features').$type<unknown[]>().notNull().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('betterpay_product_plan_version_idx').on(table.planId, table.version),
  index('betterpay_product_group_idx').on(table.groupId),
]);

export const betterpayFeature = pgTable('betterpay_feature', {
  id: text('id').primaryKey(),
  type: text('type').notNull(), // 'boolean' | 'metered'
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const betterpayProductFeature = pgTable('betterpay_product_feature', {
  productId: text('product_id').notNull().references(() => betterpayProduct.id),
  featureId: text('feature_id').notNull().references(() => betterpayFeature.id),
  meteredLimit: integer('metered_limit'),
  meteredReset: text('metered_reset'), // 'day' | 'week' | 'month' | 'year'
});

// ── Subscription tables ──────────────────────────────────────────────────

export const betterpaySubscription = pgTable('betterpay_subscription', {
  id: text('id').primaryKey(),
  customerId: text('customer_id').notNull().references(() => betterpayCustomer.id),
  planId: text('plan_id').notNull(),
  groupId: text('group_id').notNull(),
  status: text('status').notNull().default('scheduled'),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
  currentPeriodStartAt: timestamp('current_period_start_at', { withTimezone: true }),
  currentPeriodEndAt: timestamp('current_period_end_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('betterpay_subscription_customer_group_idx').on(table.customerId, table.groupId),
  index('betterpay_subscription_status_idx').on(table.status),
]);

// ── Entitlement tables ───────────────────────────────────────────────────

export const betterpayEntitlement = pgTable('betterpay_entitlement', {
  id: text('id').primaryKey(),
  customerId: text('customer_id').notNull().references(() => betterpayCustomer.id),
  featureId: text('feature_id').notNull(),
  subscriptionId: text('subscription_id').notNull().references(() => betterpaySubscription.id),
  limit: integer('limit'), // null = unlimited
  used: integer('used').notNull().default(0),
  nextResetAt: timestamp('next_reset_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('betterpay_entitlement_customer_feature_idx').on(table.customerId, table.featureId),
  index('betterpay_entitlement_subscription_idx').on(table.subscriptionId),
]);

// ── Invoice tables ───────────────────────────────────────────────────────

export const betterpayInvoice = pgTable('betterpay_invoice', {
  id: text('id').primaryKey(),
  customerId: text('customer_id').notNull().references(() => betterpayCustomer.id),
  subscriptionId: text('subscription_id').notNull().references(() => betterpaySubscription.id),
  planId: text('plan_id').notNull(),
  amount: bigint('amount', { mode: 'number' }).notNull(),
  currency: text('currency').notNull().default('IDR'),
  status: text('status').notNull().default('draft'),
  dueAt: timestamp('due_at', { withTimezone: true }).notNull(),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('betterpay_invoice_customer_idx').on(table.customerId),
  index('betterpay_invoice_subscription_idx').on(table.subscriptionId),
  index('betterpay_invoice_status_due_idx').on(table.status, table.dueAt),
]);

// ── Payment tables (from wabase, adapted) ────────────────────────────────

export const paymentTransaction = pgTable('payment_transaction', {
  id: text('id').primaryKey(),
  orderId: text('order_id').notNull(),
  providerId: text('provider_id').notNull(),
  status: text('status').notNull().default('pending'),
  amount: bigint('amount', { mode: 'number' }).notNull(),
  currency: text('currency').notNull().default('IDR'),
  customerEmail: text('customer_email').notNull(),
  metadata: jsonb('metadata').$type<Record<string, string>>(),
  providerTransactionId: text('provider_transaction_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('payment_transaction_order_id_idx').on(table.orderId),
  index('payment_transaction_provider_idx').on(table.providerId),
  index('payment_transaction_status_idx').on(table.status),
]);

export const paymentEvent = pgTable('payment_event', {
  id: text('id').primaryKey(),
  transactionId: text('transaction_id').notNull().references(() => paymentTransaction.id),
  seq: integer('seq').notNull(),
  type: text('type').notNull(),
  data: jsonb('data'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('payment_event_transaction_idx').on(table.transactionId),
]);

export const paymentWebhookEvent = pgTable('payment_webhook_event', {
  id: text('id').primaryKey(),
  providerId: text('provider_id').notNull(),
  providerEventId: text('provider_event_id'),
  eventName: text('event_name'),
  payload: jsonb('payload'),
  signatureValid: boolean('signature_valid').notNull().default(false),
  processed: boolean('processed').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('payment_webhook_event_provider_event_idx').on(table.providerId, table.providerEventId),
]);

export const paymentIdempotencyKey = pgTable('payment_idempotency_key', {
  key: text('key').primaryKey(),
  transactionId: text('transaction_id').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
