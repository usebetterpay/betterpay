import { describe, it, expect } from 'vitest';
import { billing, feature, plan } from '../src/index';
import type { SubscriptionRepository } from '../src/subscription/service';
import type { EntitlementRepository } from '../src/entitlement/service';
import type { CustomerRepository } from '../src/customer/service';
import type { InvoiceRepository } from '../src/invoice/service';
import type {
  SubscriptionRecord,
  EntitlementRecord,
  CustomerRecord,
  InvoiceRecord,
} from '../src/types';

/** Fake durable bag — proves injection, not in-memory defaults. */
function createTrackingRepos() {
  const customers = new Map<string, CustomerRecord>();
  const subscriptions = new Map<string, SubscriptionRecord>();
  const entitlements = new Map<string, EntitlementRecord>();
  const invoices = new Map<string, InvoiceRecord>();
  let n = 0;

  const customer: CustomerRepository = {
    async create(data) {
      const id = `track_cust_${++n}`;
      const r: CustomerRecord = {
        id,
        email: data.email,
        name: data.name,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      customers.set(id, r);
      return r;
    },
    async getById(id) {
      return customers.get(id);
    },
    async getByEmail(email) {
      return [...customers.values()].find((c) => c.email === email);
    },
    async update(id, data) {
      const r = customers.get(id);
      if (!r) return undefined;
      Object.assign(r, data, { updatedAt: new Date() });
      return { ...r };
    },
    async delete(id) {
      customers.delete(id);
    },
    async list(limit, offset) {
      return [...customers.values()].slice(offset, offset + limit);
    },
  };

  const subscription: SubscriptionRepository = {
    async create(data) {
      const id = `track_sub_${++n}`;
      const r: SubscriptionRecord = {
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
      subscriptions.set(id, r);
      return r;
    },
    async getById(id) {
      return subscriptions.get(id);
    },
    async getActiveByCustomerAndGroup(customerId, group) {
      return [...subscriptions.values()].find(
        (s) => s.customerId === customerId && s.group === group && s.status === 'active',
      );
    },
    async getScheduledByCustomerAndGroup(customerId, group) {
      return [...subscriptions.values()].filter(
        (s) => s.customerId === customerId && s.group === group && s.status === 'scheduled',
      );
    },
    async update(id, data) {
      const r = subscriptions.get(id);
      if (!r) return undefined;
      Object.assign(r, data, { updatedAt: new Date() });
      return { ...r };
    },
    async cancel(id) {
      const r = subscriptions.get(id);
      if (!r) return undefined;
      r.status = 'canceled';
      return { ...r };
    },
  };

  const entitlement: EntitlementRepository = {
    async create(data) {
      const id = `track_ent_${++n}`;
      const r: EntitlementRecord = {
        id,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      entitlements.set(id, r);
      return r;
    },
    async getByCustomerAndFeature(customerId, featureId) {
      return [...entitlements.values()].filter(
        (e) => e.customerId === customerId && e.featureId === featureId,
      );
    },
    async deduct(id, amount) {
      const r = entitlements.get(id);
      if (!r) return undefined;
      r.used += amount;
      return { ...r };
    },
    async resetIfNeeded(id) {
      return entitlements.get(id);
    },
    async deleteBySubscription(subscriptionId) {
      for (const [id, e] of entitlements) {
        if (e.subscriptionId === subscriptionId) entitlements.delete(id);
      }
    },
  };

  const invoice: InvoiceRepository = {
    async create(data) {
      const id = `track_inv_${++n}`;
      const r: InvoiceRecord = {
        id,
        ...data,
        status: 'open',
        paidAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      invoices.set(id, r);
      return r;
    },
    async getById(id) {
      return invoices.get(id);
    },
    async getBySubscription(subscriptionId) {
      return [...invoices.values()].filter((i) => i.subscriptionId === subscriptionId);
    },
    async updateStatus(id, status, paidAt) {
      const r = invoices.get(id);
      if (!r) return undefined;
      r.status = status;
      if (paidAt) r.paidAt = paidAt;
      return { ...r };
    },
    async getOverdue(now) {
      return [...invoices.values()].filter((i) => i.status === 'open' && i.dueAt < now);
    },
  };

  return {
    repositories: { subscription, entitlement, customer, invoice },
    maps: { customers, subscriptions, entitlements, invoices },
  };
}

describe('billing({ repositories }) injection', () => {
  const messages = feature({ id: 'messages', type: 'metered' });
  const free = plan({
    id: 'free',
    group: 'base',
    default: true,
    name: 'Free',
    includes: [messages({ limit: 100, reset: 'month' })],
  });

  it('uses in-memory repos when repositories omitted', async () => {
    const plugin = billing({ products: [free] });
    expect(plugin.$Infer).toBeDefined();
    expect((plugin.$Infer as { billingUsesInMemory?: boolean }).billingUsesInMemory).toBe(true);

    const data = (plugin.$Infer as { billing: any }).billing;
    const customer = await data.customer.create({ email: 'a@test.com' });
    expect(customer.id).toMatch(/^cust_/);
  });

  it('uses injected repos exclusively when provided', async () => {
    const { repositories, maps } = createTrackingRepos();
    const plugin = billing({ products: [free], repositories });

    expect((plugin.$Infer as { billingUsesInMemory?: boolean }).billingUsesInMemory).toBe(false);

    const data = (plugin.$Infer as { billing: any }).billing;
    const customer = await data.customer.create({ email: 'injected@test.com' });

    // Tracking repo id prefix proves we did not use createInMemoryCustomerRepo
    expect(customer.id).toMatch(/^track_cust_/);
    expect(maps.customers.has(customer.id)).toBe(true);

    const sub = await data.subscription.subscribe({
      customerId: customer.id,
      plan: free,
    });
    expect(sub.id).toMatch(/^track_sub_/);
    expect(maps.subscriptions.has(sub.id)).toBe(true);

    await data.entitlement.createEntitlements(customer.id, sub.id, free.includes);
    expect([...maps.entitlements.values()].some((e) => e.customerId === customer.id)).toBe(true);

    const check = await data.entitlement.check(customer.id, 'messages');
    expect(check.allowed).toBe(true);
    expect(check.balance.remaining).toBe(100);
  });
});
