// ── @betterpay/billing — In-memory repositories ──────────────────────────
// Default in-memory implementations for all billing repos.
// Used when no real DB adapter (Drizzle) is connected.

import type {
  SubscriptionRecord,
  EntitlementRecord,
  CustomerRecord,
  InvoiceRecord,
  InvoiceStatus,
} from './types';
import type { SubscriptionRepository } from './subscription/service';
import type { EntitlementRepository } from './entitlement/service';
import type { CustomerRepository } from './customer/service';
import type { InvoiceRepository } from './invoice/service';
import { computeNextResetAt } from './entitlement/service';

// ── In-memory Subscription Repository ────────────────────────────────────

export function createInMemorySubscriptionRepo(): SubscriptionRepository {
  const records = new Map<string, SubscriptionRecord>();
  let idCounter = 0;

  return {
    async create(data) {
      const id = `sub_${++idCounter}`;
      const record: SubscriptionRecord = {
        id,
        customerId: data.customerId,
        planId: data.planId,
        group: data.group,
        status: data.status,
        cancelAtPeriodEnd: data.cancelAtPeriodEnd ?? false,
        currentPeriodStartAt: data.currentPeriodStartAt ?? null,
        currentPeriodEndAt: data.currentPeriodEndAt ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      records.set(id, record);
      return record;
    },
    async getById(id) { return records.get(id); },
    async getActiveByCustomerAndGroup(customerId, group) {
      return Array.from(records.values()).find(
        (r) => r.customerId === customerId && r.group === group && r.status === 'active',
      );
    },
    async getScheduledByCustomerAndGroup(customerId, group) {
      return Array.from(records.values()).filter(
        (r) => r.customerId === customerId && r.group === group && r.status === 'scheduled',
      );
    },
    async update(id, data) {
      const r = records.get(id);
      if (!r) return undefined;
      Object.assign(r, data, { updatedAt: new Date() });
      return { ...r };
    },
    async cancel(id) {
      const r = records.get(id);
      if (!r) return undefined;
      r.status = 'canceled';
      r.updatedAt = new Date();
      return { ...r };
    },
  };
}

// ── In-memory Entitlement Repository ─────────────────────────────────────

export function createInMemoryEntitlementRepo(): EntitlementRepository {
  const records = new Map<string, EntitlementRecord>();
  let idCounter = 0;

  return {
    async create(data) {
      const id = `ent_${++idCounter}`;
      const record: EntitlementRecord = {
        id,
        customerId: data.customerId,
        featureId: data.featureId,
        subscriptionId: data.subscriptionId,
        limit: data.limit,
        used: data.used,
        nextResetAt: data.nextResetAt,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      records.set(id, record);
      return record;
    },
    async getByCustomerAndFeature(customerId, featureId) {
      return Array.from(records.values()).filter(
        (r) => r.customerId === customerId && r.featureId === featureId,
      );
    },
    async deduct(id, amount) {
      const r = records.get(id);
      if (!r) return undefined;
      r.used += amount;
      r.updatedAt = new Date();
      return { ...r };
    },
    async resetIfNeeded(id, now) {
      const r = records.get(id);
      if (!r) return undefined;
      if (!r.nextResetAt || r.nextResetAt > now) return r;
      r.used = 0;
      r.nextResetAt = computeNextResetAt('month', now);
      r.updatedAt = new Date();
      return { ...r };
    },
    async deleteBySubscription(subscriptionId) {
      for (const [id, r] of records) {
        if (r.subscriptionId === subscriptionId) records.delete(id);
      }
    },
  };
}

// ── In-memory Customer Repository ────────────────────────────────────────

export function createInMemoryCustomerRepo(): CustomerRepository {
  const records = new Map<string, CustomerRecord>();
  let idCounter = 0;

  return {
    async create(data) {
      const id = `cust_${++idCounter}`;
      const record: CustomerRecord = {
        id,
        email: data.email,
        name: data.name,
        phone: data.phone,
        metadata: data.metadata,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      records.set(id, record);
      return record;
    },
    async getById(id) { return records.get(id); },
    async getByEmail(email) {
      return Array.from(records.values()).find((r) => r.email === email);
    },
    async update(id, data) {
      const r = records.get(id);
      if (!r) return undefined;
      Object.assign(r, data, { updatedAt: new Date() });
      return { ...r };
    },
    async delete(id) { records.delete(id); },
    async list(limit, offset) {
      return Array.from(records.values()).slice(offset, offset + limit);
    },
  };
}

// ── In-memory Invoice Repository ─────────────────────────────────────────

export function createInMemoryInvoiceRepo(): InvoiceRepository {
  const records = new Map<string, InvoiceRecord>();
  let idCounter = 0;

  return {
    async create(data) {
      const id = `inv_${++idCounter}`;
      const record: InvoiceRecord = {
        id,
        customerId: data.customerId,
        subscriptionId: data.subscriptionId,
        planId: data.planId,
        amount: data.amount,
        currency: data.currency,
        status: 'open' as InvoiceStatus,
        dueAt: data.dueAt,
        paidAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      records.set(id, record);
      return record;
    },
    async getById(id) { return records.get(id); },
    async getBySubscription(subscriptionId) {
      return Array.from(records.values()).filter((r) => r.subscriptionId === subscriptionId);
    },
    async updateStatus(id, status, paidAt?) {
      const r = records.get(id);
      if (!r) return undefined;
      r.status = status;
      if (paidAt) r.paidAt = paidAt;
      r.updatedAt = new Date();
      return { ...r };
    },
    async getOverdue(now) {
      return Array.from(records.values()).filter(
        (r) => r.status === 'open' && r.dueAt < now,
      );
    },
  };
}
