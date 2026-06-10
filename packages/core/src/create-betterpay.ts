// ── createBetterPay — Main factory function ──────────────────────────────
// Wires plugins, providers, transaction service, and router together.

import type { BetterPayPlugin } from './plugin';
import type { PaymentProvider } from './provider/interface';
import { ProviderRegistry } from './provider/registry';
import { TransactionService, type TransactionRepository } from './transaction/service';
import { WebhookHandler } from './webhook/handler';
import { createPayRouter } from './router';

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

  /** Registered plugins. */
  plugins: BetterPayPlugin[];
}

/**
 * Create a BetterPay instance.
 *
 * @example
 * ```ts
 * import { betterPay } from "@betterpay/core";
 * import { midtrans } from "@betterpay/midtrans";
 *
 * const pay = betterPay({
 *   plugins: [midtrans({ serverKey: "..." })],
 * });
 * ```
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

  // ── Router ─────────────────────────────────────────────────────────────
  const router = createPayRouter({
    providerRegistry,
    transactionService,
    webhookHandler,
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

  // ── Convenience methods ────────────────────────────────────────────────
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

    if (!provider) {
      throw new Error('No provider available');
    }

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

  async function handleWebhook(
    providerId: string,
    data: { body: string; headers: Record<string, string> },
  ) {
    const result = await webhookHandler.handle(providerId, data);
    return {
      success: result.success,
      eventName: result.eventName,
      error: result.error,
    };
  }

  return {
    handler,
    providerRegistry,
    transactionService,
    webhookHandler,
    createTransaction,
    getStatus,
    handleWebhook,
    plugins,
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
