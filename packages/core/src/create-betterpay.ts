// ── createBetterPay — Main factory function ──────────────────────────────
// Wires plugins, providers, transaction service, billing, and router together.

import type { BetterPayPlugin } from './plugin';
import type { PaymentProvider } from './provider/interface';
import { ProviderRegistry } from './provider/registry';
import { TransactionService, type TransactionRepository } from './transaction/service';
import { WebhookHandler } from './webhook/handler';
import {
  InMemoryWebhookEventRepository,
  type WebhookEventRepository,
} from './webhook/event-store';
import { createPayRouter } from './router';
import type { BillingPluginData } from './billing-bridge';
import { createLogger, type Logger } from './logging/logger';
import { createRateLimiter, type RateLimiter } from './security/rate-limiter';
import { ReconciliationWorker } from './reconciliation/reconciliation-worker';
import type { CircuitBreaker } from './utils/circuit-breaker';
import { createPaymentLinkWithResilience } from './provider/execute-with-resilience';
import type { TransactionStatus } from './transaction/schema';
import { BetterPayError } from './errors/betterpay-error';
import type { SecurityMiddleware, SecurityContext } from './security/middleware';
import { executeMiddlewareChain } from './security/middleware';
import {
  DefaultCredentialStore,
  NullCredentialStore,
  type CredentialStore,
  type CredentialRepository,
} from './security/credential-store';
import {
  NotificationDispatcher,
  type NotificationChannel,
} from './notification/channel';
import type { PayContext } from './context';

export interface BetterPayOptions {
  /** PostgreSQL connection string or database adapter (future). */
  database?: string;

  /** Plugin instances. */
  plugins?: BetterPayPlugin[];

  /** Optional: custom transaction repository (defaults to in-memory for MVP). */
  transactionRepository?: TransactionRepository;

  /**
   * Optional: webhook event store for idempotency.
   * Defaults to process-local in-memory store (dev/test only).
   * Production must inject a durable store (e.g. drizzle webhookEvent repo).
   */
  webhookEventRepository?: WebhookEventRepository;

  /** Optional: identify the current customer from a request. */
  identify?: (request: Request) => Promise<{ customerId: string; email: string } | null>;

  /** Optional: custom logger instance. */
  logger?: Logger;

  /** Optional: rate limiter configuration. */
  rateLimit?: {
    enabled?: boolean;
    windowMs?: number;
    maxRequests?: number;
  };

  /**
   * When true, createTransaction may try the next eligible provider after
   * retryable failures (circuit open / 5xx). Default false — avoids surprise
   * dual payment links. Opt in only when your UX can handle provider switches.
   * Failover applies only to create-link failures before the customer pays.
   */
  failover?: boolean;

  /**
   * Reconciliation: poll providers for pending/active transactions missing webhooks.
   * Prefer external cron → POST /api/reconcile in production (serverless-safe).
   * Set `startInterval: true` only for long-lived Node processes.
   */
  reconciliation?: {
    enabled?: boolean;
    /** @deprecated use startInterval */
    intervalMs?: number;
    /** In-process setInterval (default false). Prefer cron + runReconciliation. */
    startInterval?: boolean;
    intervalMinutes?: number;
    batchSize?: number;
    maxAgeHours?: number;
  };

  /**
   * Master encryption key for credential storage.
   * Required if using DB-backed credential store.
   * Must be at least 32 characters.
   * Set via env var: BETTERPAY_MASTER_KEY
   */
  masterKey?: string;

  /** Optional: credential repository (DB-backed). If provided with masterKey, enables credential store. */
  credentialRepository?: CredentialRepository;

  /** Optional: security middleware hooks for authentication, CSRF, and authorization. */
  middleware?: {
    /** Middlewares executed before request handling (e.g., auth, CSRF validation). */
    before?: SecurityMiddleware[];
    /** Middlewares executed after request handling (e.g., audit logging). */
    after?: SecurityMiddleware[];
    /** Error handler for unhandled errors in request processing. */
    onError?: (error: Error, ctx: SecurityContext) => Response | void | Promise<Response | void>;
  };
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
    createCustomer: (data: {
      email: string;
      name?: string;
      phone?: string;
    }) => Promise<{ id: string; email: string; phone?: string }>;
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

  /** Logger instance. */
  logger: Logger;

  /** Rate limiter instance (if enabled). */
  rateLimiter: RateLimiter | null;

  /** Reconciliation worker instance (always constructed; list may be empty without repo support). */
  reconciliationWorker: ReconciliationWorker;

  /** Run reconciliation once (also used by POST /api/reconcile). */
  runReconciliation: () => Promise<{
    totalChecked: number;
    updated: number;
    conflicts: number;
    errors: number;
  }>;

  /** Credential store for encrypted provider secrets. */
  credentialStore: CredentialStore;

  /** Notification dispatcher (plugin channels). */
  notifications: NotificationDispatcher;
}

/**
 * Create a BetterPay instance.
 */
export function betterPay(options: BetterPayOptions = {}): BetterPayInstance {
  const plugins = options.plugins ?? [];

  // ── Collect providers + channels + endpoints from plugins ──────────────
  const providerRegistry = new ProviderRegistry();
  const notificationChannels: NotificationChannel[] = [];
  const extraEndpoints: Record<string, unknown> = {};
  const onRequestHooks: Array<
    NonNullable<BetterPayPlugin['onRequest']>
  > = [];
  const onResponseHooks: Array<
    NonNullable<BetterPayPlugin['onResponse']>
  > = [];

  for (const plugin of plugins) {
    if (plugin.providers) {
      for (const provider of plugin.providers as (PaymentProvider & { priority?: number })[]) {
        providerRegistry.register(provider);
      }
    }
    if (plugin.notificationChannels?.length) {
      notificationChannels.push(...plugin.notificationChannels);
    }
    if (plugin.endpoints) {
      for (const [key, ep] of Object.entries(plugin.endpoints)) {
        if (key in extraEndpoints) {
          // last plugin wins; warn after logger exists
        }
        extraEndpoints[key] = ep;
      }
    }
    if (plugin.onRequest) onRequestHooks.push(plugin.onRequest);
    if (plugin.onResponse) onResponseHooks.push(plugin.onResponse);
  }

  // ── Initialize Logger (early, so it can be used by other components) ────
  const logger = options.logger ?? createLogger({ level: 'info' });
  logger.debug('BetterPay instance initializing', { 
    pluginCount: plugins.length,
    providerCount: providerRegistry.list().length,
    notificationChannels: notificationChannels.length,
  });

  const notifications = new NotificationDispatcher(
    notificationChannels,
    (err, channelId, event) => {
      logger.warn('Notification channel failed', {
        channelId,
        event: event.name,
        error: err instanceof Error ? err.message : String(err),
      });
    },
  );

  // ── Credential store ──────────────────────────────────────────────────
  const credentialStore: CredentialStore =
    options.masterKey && options.credentialRepository
      ? new DefaultCredentialStore(options.credentialRepository, options.masterKey)
      : new NullCredentialStore();

  logger.debug('Credential store', {
    enabled: !(credentialStore instanceof NullCredentialStore),
  });

  // ── Transaction service ────────────────────────────────────────────────
  const repo = options.transactionRepository ?? createInMemoryRepository();
  const transactionService = new TransactionService(repo);

  // ── Webhook handler ────────────────────────────────────────────────────
  const allProviders = providerRegistry.list();
  const webhookEventRepository =
    options.webhookEventRepository ?? new InMemoryWebhookEventRepository();
  const webhookHandler = new WebhookHandler({
    providers: allProviders,
    transactionService,
    logger,
    webhookEventRepository,
  });

  // ── Detect billing plugin ──────────────────────────────────────────────
  let billingData: BillingPluginData | null = null;
  let billingUsesInMemory = false;
  for (const plugin of plugins) {
    if (plugin.id === 'billing' && plugin.$Infer && 'billing' in plugin.$Infer) {
      billingData = plugin.$Infer.billing as BillingPluginData;
      billingUsesInMemory = Boolean(
        (plugin.$Infer as { billingUsesInMemory?: boolean }).billingUsesInMemory,
      );
      break;
    }
  }

  if (billingUsesInMemory && process.env.NODE_ENV === 'production') {
    logger.warn(
      'Billing plugin is using in-memory repositories in production. ' +
        'Inject durable repositories via billing({ repositories: ... }) or data will be lost on restart.',
    );
  }

  // ── Initialize Rate Limiter ────────────────────────────────────────────
  let rateLimiter: RateLimiter | null = null;
  if (options.rateLimit?.enabled !== false) {
    rateLimiter = createRateLimiter({
      windowMs: options.rateLimit?.windowMs ?? 60000,
      max: options.rateLimit?.maxRequests ?? 100,
    });
    logger.debug('Rate limiter initialized', { 
      windowMs: options.rateLimit?.windowMs ?? 60000,
      max: options.rateLimit?.maxRequests ?? 100 
    });
  }

  // ── Resilience (retry + circuit breaker + optional failover) ───────────
  const providerBreakers = new Map<string, CircuitBreaker>();
  const useFailover = options.failover === true;

  // ── Reconciliation Worker (real list + checkStatus wiring) ─────────────
  const providerAdapters = new Map<
    string,
    { id: string; getTransactionStatus: (id: string) => Promise<{ status: string; metadata?: Record<string, unknown> }> }
  >();
  for (const provider of providerRegistry.list()) {
    if (typeof provider.checkStatus === 'function') {
      const checkStatus = provider.checkStatus.bind(provider);
      providerAdapters.set(provider.id, {
        id: provider.id,
        getTransactionStatus: async (providerTransactionId: string) => {
          const result = await checkStatus(providerTransactionId);
          return { status: result.status, metadata: result.raw as Record<string, unknown> | undefined };
        },
      });
    }
  }

  const reconciliationWorker = new ReconciliationWorker(
    {
      intervalMinutes:
        options.reconciliation?.intervalMinutes ??
        (options.reconciliation?.intervalMs
          ? options.reconciliation.intervalMs / 60_000
          : 60),
      batchSize: options.reconciliation?.batchSize ?? 100,
      maxAgeHours: options.reconciliation?.maxAgeHours ?? 24,
      providerIds: providerRegistry.list().map((p) => p.id),
    },
    providerAdapters,
    async (providerIds, maxAge, limit) => {
      const rows = await transactionService.listPendingForReconciliation(
        providerIds,
        maxAge,
        limit,
      );
      return rows
        .filter((t) => t.providerTransactionId)
        .map((t) => ({
          id: t.id,
          orderId: t.orderId,
          providerId: t.providerId,
          providerTransactionId: t.providerTransactionId as string,
          status: t.status,
          amount: t.amount,
          currency: t.currency,
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
        }));
    },
    async (orderId, status) => {
      const normalized = status as TransactionStatus;
      await transactionService.updateStatus(orderId, normalized);
    },
  );

  async function runReconciliation() {
    const run = await reconciliationWorker.run();
    return {
      totalChecked: run.totalChecked,
      updated: run.updated,
      conflicts: run.conflicts,
      errors: run.errors,
    };
  }

  const startInterval =
    options.reconciliation?.enabled === true &&
    (options.reconciliation.startInterval === true ||
      // legacy: enabled alone used to start interval — prefer explicit startInterval
      options.reconciliation.startInterval === undefined &&
        options.reconciliation.intervalMs !== undefined);

  if (startInterval) {
    reconciliationWorker.start();
    logger.debug('Reconciliation interval started', {
      intervalMinutes:
        options.reconciliation?.intervalMinutes ??
        (options.reconciliation?.intervalMs
          ? options.reconciliation.intervalMs / 60_000
          : 60),
    });
  } else if (options.reconciliation?.enabled) {
    logger.debug(
      'Reconciliation enabled without interval — call runReconciliation() or POST /api/reconcile via cron',
    );
  }

  // ── Billing cycle runner (when billing plugin present) ─────────────────
  if (
    billingData &&
    typeof (billingData as unknown as { __wireBillingCycle?: unknown }).__wireBillingCycle ===
      'function'
  ) {
    (billingData as unknown as {
      __wireBillingCycle: (deps: {
        createPaymentForSubscription: (
          sub: { id: string; customerId: string; planId: string },
          plan: { id: string; name?: string; price?: { amount: number; currency: string } },
        ) => Promise<{ paymentUrl: string; providerTransactionId: string }>;
        onPaymentFailure?: (subscriptionId: string) => Promise<void>;
      }) => void;
    }).__wireBillingCycle({
      createPaymentForSubscription: async (sub, plan) => {
        const amount = plan.price?.amount ?? 0;
        const currency = plan.price?.currency ?? 'IDR';
        const orderId = `bp_renew_${sub.id}_${Date.now()}`;
        const { provider, result } = await createPaymentLinkWithResilience(
          providerRegistry,
          {
            orderId,
            amount,
            currency,
            customerEmail: sub.customerId,
            description: `Renewal: ${plan.name ?? plan.id}`,
            callbackUrl: '',
            returnUrl: '',
          },
          {
            breakers: providerBreakers,
            failover: useFailover,
            retry: { maxAttempts: 3, baseDelayMs: 200, maxDelayMs: 5_000 },
          },
        );
        await transactionService.create({
          orderId,
          providerId: provider.id,
          amount,
          currency,
          customerEmail: sub.customerId,
          metadata: { subscriptionId: sub.id, kind: 'renewal' },
        });
        await transactionService.updateStatus(orderId, 'active', result.providerTransactionId);
        return {
          paymentUrl: result.paymentUrl ?? '',
          providerTransactionId: result.providerTransactionId,
        };
      },
      onPaymentFailure: async (subscriptionId) => {
        // Dunning is applied inside billing's createPayment wrapper; notify only.
        let customerKey: string | undefined;
        try {
          const sub = (await billingData.subscription.getById?.(subscriptionId)) as
            | { customerId?: string }
            | undefined;
          customerKey = sub?.customerId;
        } catch {
          /* best-effort */
        }
        const contact = await resolveCustomerContact(billingData, customerKey);
        void notifications.emit({
          name: 'payment.failed',
          customerEmail: contact.email,
          customerPhone: contact.phone,
          payload: { subscriptionId, phase: 'renewal' },
        });
      },
    });
    logger.debug('Billing cycle runner wired');
  }

  // ── Router ─────────────────────────────────────────────────────────────
  const router = createPayRouter({
    providerRegistry,
    transactionService,
    webhookHandler,
    billing: billingData,
    logger,
    rateLimiter,
    runReconciliation,
    extraEndpoints,
    createPaymentLink: async (input) => {
      const { provider, result } = await createPaymentLinkWithResilience(
        providerRegistry,
        input,
        {
          breakers: providerBreakers,
          failover: useFailover,
          retry: {
            maxAttempts: 3,
            baseDelayMs: 200,
            maxDelayMs: 5_000,
          },
        },
      );
      return { provider, result };
    },
  });

  const payContext: PayContext = {
    logger,
    providerRegistry,
    transactionService,
  };

  // ── Handler function ───────────────────────────────────────────────────
  async function handler(request: Request): Promise<Response> {
    const requestId = Math.random().toString(36).substring(7);
    const startTime = Date.now();
    
    logger.debug('Request received', { 
      requestId,
      method: request.method,
      url: request.url,
      contentType: request.headers.get('content-type')
    });

    // Create security context for middleware
    const securityCtx: SecurityContext = {
      request,
      metadata: {
        requestId,
        startTime,
      },
    };

    try {
      // Request size limit (10MB default)
      const contentLength = request.headers.get('content-length');
      if (contentLength) {
        const size = parseInt(contentLength, 10);
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (size > maxSize) {
          logger.warn('Request too large', { 
            requestId,
            size,
            maxSize 
          });
          return new Response(JSON.stringify({ 
            error: 'Request too large',
            maxSize: '10MB'
          }), {
            status: 413,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }

      // Rate limiting check
      if (rateLimiter) {
        const clientIp = request.headers.get('x-forwarded-for') ?? 
                        request.headers.get('x-real-ip') ?? 
                        'unknown';
        const result = rateLimiter.check(clientIp);
        if (!result.allowed) {
          logger.warn('Rate limit exceeded', { requestId, clientIp });
          return new Response(JSON.stringify({ 
            error: 'Rate limit exceeded',
            retryAfter: result.retryAfterMs ?? 0 
          }), {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': Math.ceil((result.retryAfterMs ?? 0) / 1000).toString(),
            },
          });
        }
      }

      // Plugin onRequest hooks
      for (const hook of onRequestHooks) {
        const early = await hook(request, payContext);
        if (early?.response) {
          return early.response;
        }
      }

      // Execute before middlewares (auth, CSRF, etc.)
      if (options.middleware?.before && options.middleware.before.length > 0) {
        const middlewareResponse = await executeMiddlewareChain(
          options.middleware.before,
          securityCtx
        );
        if (middlewareResponse) {
          logger.debug('Request blocked by middleware', { requestId });
          return middlewareResponse;
        }
      }

      const response = await router.handler(request);

      for (const hook of onResponseHooks) {
        try {
          await hook(response, payContext);
        } catch (err) {
          logger.warn('Plugin onResponse failed', {
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
      
      // Execute after middlewares (audit logging, etc.)
      if (options.middleware?.after && options.middleware.after.length > 0) {
        const middlewareResponse = await executeMiddlewareChain(
          options.middleware.after,
          securityCtx
        );
        if (middlewareResponse) {
          logger.debug('After middleware returned response', { requestId });
          return middlewareResponse;
        }
      }
      
      const duration = Date.now() - startTime;
      logger.debug('Request completed', { 
        requestId,
        status: response.status,
        duration 
      });
      
      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      if (error instanceof BetterPayError) {
        logger.error('BetterPayError', { 
          requestId,
          code: error.code,
          message: error.message,
          duration 
        });
        
        return new Response(JSON.stringify(error.toJSON()), {
          status: error.statusCode,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      
      logger.error('Unhandled error', { 
        requestId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        duration 
      });
      
      // Call custom error handler if provided
      if (options.middleware?.onError) {
        try {
          const customResponse = await options.middleware.onError(
            error instanceof Error ? error : new Error(String(error)),
            securityCtx
          );
          if (customResponse instanceof Response) {
            return customResponse;
          }
        } catch (handlerError) {
          logger.error('Error handler failed', {
            requestId,
            error: handlerError instanceof Error ? handlerError.message : String(handlerError),
          });
        }
      }
      
      return new Response(JSON.stringify({ 
        error: 'Internal server error',
        requestId 
      }), {
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
    const { provider, result } = await createPaymentLinkWithResilience(
      providerRegistry,
      {
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
        providerId: data.providerId,
      },
      {
        breakers: providerBreakers,
        failover: useFailover,
        retry: {
          maxAttempts: 3,
          baseDelayMs: 200,
          maxDelayMs: 5_000,
        },
      },
    );

    const txn = await transactionService.create({
      orderId: data.orderId,
      providerId: provider.id,
      amount: data.amount,
      currency: data.currency ?? 'IDR',
      customerEmail: data.customerEmail,
      metadata: data.metadata,
    });

    await transactionService.updateStatus(data.orderId, 'active', result.providerTransactionId);

    logger.info('Transaction created', {
      orderId: data.orderId,
      providerId: provider.id,
      failover: useFailover,
    });

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
    if (
      result.success &&
      !result.duplicate &&
      result.orderId &&
      (result.eventName === 'payment.completed' || result.eventName === 'payment.succeeded')
    ) {
      const txn = await transactionService.getByOrderId(result.orderId);
      if (txn) {
        const subscriptionId = txn.metadata?.subscriptionId;
        if (subscriptionId && billingData?.dunning) {
          try {
            await billingData.dunning.onPaymentSuccess(subscriptionId);
          } catch (err) {
            logger.warn('Dunning onPaymentSuccess failed', {
              subscriptionId,
              error: err instanceof Error ? err.message : String(err),
            });
          }
        }

        const contact = await resolveCustomerContact(
          billingData,
          subscriptionId
            ? ((await billingData?.subscription.getById?.(subscriptionId)) as
                | { customerId?: string }
                | undefined)?.customerId ?? txn.customerEmail
            : txn.customerEmail,
        );

        void notifications.emit({
          name: 'transaction.completed',
          customerEmail: contact.email ?? txn.customerEmail,
          customerPhone: contact.phone,
          payload: {
            orderId: txn.orderId,
            amount: txn.amount,
            currency: txn.currency,
            providerId: txn.providerId,
            ...(subscriptionId ? { subscriptionId } : {}),
          },
        });
      }
    }
    return { success: result.success, eventName: result.eventName, error: result.error };
  }

  // ── Billing convenience methods ────────────────────────────────────────
  const billingAPI: BetterPayInstance['billing'] = billingData
    ? createBillingAPI(billingData, providerRegistry, transactionService, {
        breakers: providerBreakers,
        failover: useFailover,
        notifications,
      })
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
    logger,
    rateLimiter,
    reconciliationWorker,
    runReconciliation,
    credentialStore,
    notifications,
  };
}

// ── Billing API builder ──────────────────────────────────────────────────

function createBillingAPI(
  billing: BillingPluginData,
  providerRegistry: ProviderRegistry,
  transactionService: TransactionService,
  resilience: {
    breakers: Map<string, CircuitBreaker>;
    failover: boolean;
    notifications: NotificationDispatcher;
  },
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

      // If paid plan, create payment link (retry + CB; optional failover)
      let paymentUrl: string | undefined;
      if (planDef.price && planDef.price.amount > 0 && providerRegistry.list().length > 0) {
        try {
          const orderId = `bp_sub_${sub.id}`;
          const { provider, result } = await createPaymentLinkWithResilience(
            providerRegistry,
            {
              orderId,
              amount: planDef.price.amount,
              currency: planDef.price.currency,
              customerEmail: data.customerId,
              description: `Subscription: ${planDef.name}`,
              callbackUrl: '',
              returnUrl: '',
            },
            {
              breakers: resilience.breakers,
              failover: resilience.failover,
              retry: { maxAttempts: 3, baseDelayMs: 200, maxDelayMs: 5_000 },
            },
          );

          await transactionService.create({
            orderId,
            providerId: provider.id,
            amount: planDef.price.amount,
            currency: planDef.price.currency,
            customerEmail: data.customerId,
            metadata: { subscriptionId: sub.id },
          });

          paymentUrl = result.paymentUrl;
          await transactionService.updateStatus(orderId, 'active', result.providerTransactionId);

          const contact = await resolveCustomerContact(billing, data.customerId);
          void resilience.notifications.emit({
            name: 'invoice.created',
            customerEmail: contact.email,
            customerPhone: contact.phone,
            payload: {
              subscriptionId: sub.id,
              planId: planDef.id,
              amount: planDef.price.amount,
              currency: planDef.price.currency,
              orderId,
            },
          });
        } catch {
          const contact = await resolveCustomerContact(billing, data.customerId);
          void resilience.notifications.emit({
            name: 'payment.failed',
            customerEmail: contact.email,
            customerPhone: contact.phone,
            payload: { subscriptionId: sub.id, planId: planDef.id, phase: 'subscribe' },
          });
        }
      }

      return { subscriptionId: sub.id, status: sub.status, paymentUrl };
    },

    async cancel(subscriptionId, atPeriodEnd) {
      const result = await billing.subscription.cancel(subscriptionId, atPeriodEnd);
      let contact: { email?: string; phone?: string } = {};
      try {
        const sub = (await billing.subscription.getById?.(subscriptionId)) as
          | { customerId?: string }
          | undefined;
        contact = await resolveCustomerContact(billing, sub?.customerId);
      } catch {
        /* best-effort */
      }
      void resilience.notifications.emit({
        name: 'subscription.canceled',
        customerEmail: contact.email,
        customerPhone: contact.phone,
        payload: { subscriptionId, atPeriodEnd: atPeriodEnd ?? false },
      });
      return result;
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
      const customer = (await billing.customer.create({
        email: data.email,
        name: data.name,
        phone: data.phone,
      })) as { id: string; email: string; phone?: string };
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

/** Resolve email/phone for notifications from customer id or email. */
async function resolveCustomerContact(
  billing: BillingPluginData | null | undefined,
  customerIdOrEmail?: string | null,
): Promise<{ email?: string; phone?: string }> {
  if (!customerIdOrEmail) return {};

  const looksLikeEmail = customerIdOrEmail.includes('@');
  if (!billing?.customer) {
    return looksLikeEmail ? { email: customerIdOrEmail } : {};
  }

  try {
    let cust = (await billing.customer.getById(customerIdOrEmail)) as
      | { email?: string; phone?: string }
      | null
      | undefined;
    if (!cust && looksLikeEmail) {
      cust = (await billing.customer.getByEmail(customerIdOrEmail)) as
        | { email?: string; phone?: string }
        | null
        | undefined;
    }
    if (cust) {
      return {
        email: cust.email ?? (looksLikeEmail ? customerIdOrEmail : undefined),
        phone: cust.phone,
      };
    }
  } catch {
    /* best-effort */
  }

  return looksLikeEmail ? { email: customerIdOrEmail } : {};
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
    async listPendingForReconciliation(providerIds, maxAge, limit) {
      const idSet = new Set(providerIds);
      return Array.from(transactions.values())
        .filter(
          (t) =>
            idSet.has(t.providerId) &&
            (t.status === 'pending' || t.status === 'active') &&
            t.providerTransactionId &&
            t.createdAt >= maxAge,
        )
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        .slice(0, limit);
    },
  };
}
