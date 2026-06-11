// ── createBetterPay — Main factory function ──────────────────────────────
// Wires plugins, providers, transaction service, billing, and router together.

import type { BetterPayPlugin } from './plugin';
import type { PaymentProvider } from './provider/interface';
import { ProviderRegistry } from './provider/registry';
import { TransactionService, type TransactionRepository } from './transaction/service';
import { WebhookHandler } from './webhook/handler';
import { createPayRouter } from './router';
import type { BillingPluginData } from './billing-bridge';

export interface BetterPayOptions {
  /** PostgreSQL connection string or database adapter (future). */
  database?: string;

  /** Plugin instances. */
  plugins?: BetterPayPlugin[];

  /** Optional: custom transaction repository (defaults to in-memory for MVP). */
  transactionRepository?: TransactionRepository;

  /** Optional: identify the current customer from a request. */
  identify?: (request: Request) => Promise<{ customerId: string; email: string } | null>;
}

export interface BetterPayInstance {
  /** The underlying better-call router. */
  handler: (request: Request) => Promise<Response>;

  /** Provider registry for direct access. */
  providerRegistry: ProviderRegistry;

  /** Transaction service for direct access. */
  transactionService: TransactionService;

  /** Webhook handler for direct access. */
  webhookHandler: WebhookHandler;

  /** Create a one-time payment transaction. */
  createTransaction: (data: {
    orderId: string;
    amount: number;
    currency?: string;
    customerEmail: string;
    customerName?: string;
    description?: string;
    callbackUrl?: string;
    returnUrl?: string;
    paymentMethod?: string;
    providerId?: string;
    metadata?: Record<string, string>;
  }) => Promise<{
    orderId: string;
    paymentUrl?: string;
    providerTransactionId: string;
    status: string;
  }>;

  /** Check the status of a transaction. */
  getStatus: (orderId: string) => Promise<{
    orderId: string;
    status: string;
    amount: number;
    currency: string;
    providerId: string;
  } | null>;

  /** Handle an incoming webhook request. */
  handleWebhook: (providerId: string, data: { body: string; headers: Record<string, string> }) => Promise<{
    success: boolean;
    eventName?: string;
    error?: string;
  }>;

  /** Billing API — only available when billing() plugin is loaded. */
  billing: {
    subscribe: (data: { customerId: string; planId: string }) => Promise<{ subscriptionId: string; status: string; paymentUrl?: string }>;
    cancel: (subscriptionId: string, atPeriodEnd?: boolean) => Promise<unknown>;
    getSubscription: (customerId: string, group?: string) => Promise<unknown>;
    check: (data: { customerId: string; featureId: string }) => Promise<{ allowed: boolean; balance: unknown }>;
    report: (data: { customerId: string; featureId: string; amount: number }) => Promise<{ success: boolean; balance: unknown }>;
    createCustomer: (data: { email: string; name?: string }) => Promise<{ id: string; email: string }>;
    getCustomer: (id: string) => Promise<unknown>;
    getInvoices: (subscriptionId: string) => Promise<unknown[]>;
    runBillingCycle: () => Promise<{ processed: number; succeeded: number; failed: number }>;
    /** Direct service access (advanced). */
    services: BillingPluginData | null;
    /** Whether billing plugin is loaded. */
    enabled: boolean;
  };

  /** Registered plugins. */
  plugins: BetterPayPlugin[];
}

/**
 * Create a BetterPay instance.
 */
export function betterPay(options: BetterPayOptions = {}): BetterPayInstance {
  const plugins = options.plugins ?? [];

  // ── Collect providers from plugins ──────────────────────────────────────
  const providerRegistry = new ProviderRegistry();
  for (const plugin of plugins) {
    if (plugin.providers) {
      for (const provider of plugin.providers as (PaymentProvider & { priority?: number })[]) {
        providerRegistry.register(provider);
      }
    }
  }

  // ── Transaction service ────────────────────────────────────────────────
  const repo = options.transactionRepository ?? createInMemoryRepository();
  const transactionService = new TransactionService(repo);

  // ── Webhook handler ────────────────────────────────────────────────────
  const allProviders = providerRegistry.list();
  const webhookHandler = new WebhookHandler({
    providers: allProviders,
    transactionService,
  });

  // ── Detect billing plugin ──────────────────────────────────────────────
  let billingData: BillingPluginData | null = null;
  for (const plugin of plugins) {
    if (plugin.id === 'billing' && plugin.$Infer && 'billing' in plugin.$Infer) {
      billingData = plugin.$Infer.billing as BillingPluginData;
      break;
    }
  }

  // ── Router ─────────────────────────────────────────────────────────────
  const router = createPayRouter({
    providerRegistry,
    transactionService,
    webhookHandler,
    billing: billingData,
  });

  // ── Handler function ───────────────────────────────────────────────────
  async function handler(request: Request): Promise<Response> {
    try {
      return await router.handler(request);
    } catch (error) {
      return new Response(JSON.stringify({ error: (error as Error).message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  // ── Convenience: createTransaction ─────────────────────────────────────
  async function createTransaction(data: {
    orderId: string;
    amount: number;
    currency?: string;
    customerEmail: string;
    customerName?: string;
    description?: string;
    callbackUrl?: string;
    returnUrl?: string;
    paymentMethod?: string;
    providerId?: string;
    metadata?: Record<string, string>;
  }) {
    const provider = data.providerId
      ? providerRegistry.get(data.providerId)
      : providerRegistry.getDefault();
    if (!provider) throw new Error('No provider available');

    const txn = await transactionService.create({
      orderId: data.orderId,
      providerId: provider.id,
      amount: data.amount,
      currency: data.currency ?? 'IDR',
      customerEmail: data.customerEmail,
      metadata: data.metadata,
    });

    const result = await provider.createPaymentLink({
      orderId: data.orderId,
      amount: data.amount,
      currency: data.currency ?? 'IDR',
      customerEmail: data.customerEmail,
      customerName: data.customerName,
      description: data.description ?? '',
      callbackUrl: data.callbackUrl ?? '',
      returnUrl: data.returnUrl ?? '',
      paymentMethod: data.paymentMethod,
      metadata: data.metadata,
    });

    await transactionService.updateStatus(data.orderId, 'active', result.providerTransactionId);

    return {
      orderId: txn.orderId,
      paymentUrl: result.paymentUrl,
      providerTransactionId: result.providerTransactionId,
      status: 'active',
    };
  }

  async function getStatus(orderId: string) {
    const txn = await transactionService.getByOrderId(orderId);
    if (!txn) return null;
    return {
      orderId: txn.orderId,
      status: txn.status,
      amount: txn.amount,
      currency: txn.currency,
      providerId: txn.providerId,
    };
  }

  async function handleWebhook(providerId: string, data: { body: string; headers: Record<string, string> }) {
    const result = await webhookHandler.handle(providerId, data);
    return { success: result.success, eventName: result.eventName, error: result.error };
  }

  // ── Billing convenience methods ────────────────────────────────────────
  const billingAPI: BetterPayInstance['billing'] = billingData
    ? createBillingAPI(billingData, providerRegistry, transactionService)
    : createDisabledBillingAPI();

  return {
    handler,
    providerRegistry,
    transactionService,
    webhookHandler,
    createTransaction,
    getStatus,
    handleWebhook,
    billing: billingAPI,
    plugins,
  };
}

// ── Billing API builder ──────────────────────────────────────────────────

function createBillingAPI(
  billing: BillingPluginData,
  providerRegistry: ProviderRegistry,
  transactionService: TransactionService,
): BetterPayInstance['billing'] {
  return {
    enabled: true,
    services: billing,

    async subscribe(data) {
      const planDef = billing.products.find((p) => p.id === data.planId);
      if (!planDef) throw new Error(`Plan not found: ${data.planId}`);

      const sub = await billing.subscription.subscribe({
        customerId: data.customerId,
        plan: planDef,
      }) as { id: string; status: string };

      // Create entitlements
      await billing.entitlement.createEntitlements(
        data.customerId,
        sub.id,
        planDef.includes,
      );

      // If paid plan, create payment link
      let paymentUrl: string | undefined;
      if (planDef.price && planDef.price.amount > 0 && providerRegistry.list().length > 0) {
        try {
          const provider = providerRegistry.getDefault();
          const orderId = `bp_sub_${sub.id}`;

          await transactionService.create({
            orderId,
            providerId: provider.id,
            amount: planDef.price.amount,
            currency: planDef.price.currency,
            customerEmail: data.customerId,
            metadata: { subscriptionId: sub.id },
          });

          const result = await provider.createPaymentLink({
            orderId,
            amount: planDef.price.amount,
            currency: planDef.price.currency,
            customerEmail: data.customerId,
            description: `Subscription: ${planDef.name}`,
            callbackUrl: '',
            returnUrl: '',
          });

          paymentUrl = result.paymentUrl;
          await transactionService.updateStatus(orderId, 'active', result.providerTransactionId);
        } catch {
          // Provider may not be configured — that's ok for free plans
        }
      }

      return { subscriptionId: sub.id, status: sub.status, paymentUrl };
    },

    async cancel(subscriptionId, atPeriodEnd) {
      return billing.subscription.cancel(subscriptionId, atPeriodEnd);
    },

    async getSubscription(customerId, group) {
      return billing.subscription.getActive(customerId, group ?? 'base');
    },

    async check(data) {
      return billing.entitlement.check(data.customerId, data.featureId);
    },

    async report(data) {
      return billing.entitlement.report(data.customerId, data.featureId, data.amount);
    },

    async createCustomer(data) {
      const customer = await billing.customer.create({ email: data.email, name: data.name }) as { id: string; email: string };
      return customer;
    },

    async getCustomer(id) {
      return billing.customer.getById(id);
    },

    async getInvoices(subscriptionId) {
      return billing.invoice.getBySubscription(subscriptionId);
    },

    async runBillingCycle() {
      return billing.billingCycle.run();
    },
  };
}

function createDisabledBillingAPI(): BetterPayInstance['billing'] {
  const disabled = () => { throw new Error('Billing plugin not loaded. Add billing({ products: [...] }) to plugins.'); };
  return {
    enabled: false,
    services: null,
    subscribe: disabled as any,
    cancel: disabled as any,
    getSubscription: disabled as any,
    check: disabled as any,
    report: disabled as any,
    createCustomer: disabled as any,
    getCustomer: disabled as any,
    getInvoices: disabled as any,
    runBillingCycle: disabled as any,
  };
}

// ── In-memory repository (MVP / testing) ─────────────────────────────────

function createInMemoryRepository(): TransactionRepository {
  const transactions = new Map<string, any>();
  const idempotencyKeys = new Map<string, string>();

  return {
    async createTransaction(data) {
      const record = {
        id: `txn_${Math.random().toString(36).slice(2, 10)}`,
        orderId: data.orderId,
        providerId: data.providerId,
        status: 'pending' as const,
        amount: data.amount,
        currency: data.currency,
        customerEmail: data.customerEmail,
        metadata: data.metadata ?? null,
        providerTransactionId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      transactions.set(data.orderId, record);
      return record;
    },
    async getTransactionByOrderId(orderId) {
      return transactions.get(orderId);
    },
    async updateStatus(orderId, status, providerTransactionId?) {
      const record = transactions.get(orderId);
      if (!record) return undefined;
      record.status = status;
      record.updatedAt = new Date();
      if (providerTransactionId) record.providerTransactionId = providerTransactionId;
      return record;
    },
    async checkIdempotencyKey(key) {
      return idempotencyKeys.get(key);
    },
    async setIdempotencyKey(key, transactionId) {
      idempotencyKeys.set(key, transactionId);
    },
  };
}
