// ── better-call Router ───────────────────────────────────────────────────
// Exposes BetterPay API endpoints via better-call.
// Includes optional billing endpoints when billing plugin is loaded.

import { createRouter, createEndpoint, toResponse } from 'better-call';
import type { ProviderRegistry } from './provider/registry';
import type { TransactionService } from './transaction/service';
import type { WebhookHandler } from './webhook/handler';
import type { BillingPluginData } from './billing-bridge';
import type { Logger } from './logging/logger';
import type { RateLimiter } from './security/rate-limiter';

export interface RouterContext {
  providerRegistry: ProviderRegistry;
  transactionService: TransactionService;
  webhookHandler: WebhookHandler;
  billing?: BillingPluginData | null;
  logger?: Logger;
  rateLimiter?: RateLimiter | null;
}

export function createPayRouter(ctx: RouterContext) {
  const logger = ctx.logger;
  
  // ── Core endpoints ─────────────────────────────────────────────────────

  const webhookEndpoint = createEndpoint(
    '/api/webhook/:providerId',
    { method: 'POST' },
    async (c: any) => {
      const providerId = c.params?.providerId ?? c.pathParams?.providerId;
      if (!providerId) {
        return toResponse({ error: 'Missing providerId' }, { status: 400 });
      }

      const body = await c.request.text();
      const headers: Record<string, string> = {};
      c.request.headers.forEach((value: string, key: string) => {
        headers[key] = value;
      });

      logger?.debug('Webhook received', { providerId });

      const result = await ctx.webhookHandler.handle(providerId, { body, headers });
      if (!result.success) {
        logger?.warn('Webhook processing failed', { providerId, error: result.error });
        return toResponse({ error: result.error }, { status: 400 });
      }

      logger?.info('Webhook processed successfully', { 
        providerId, 
        event: result.eventName,
        duplicate: result.duplicate 
      });

      return toResponse({ success: true, event: result.eventName, duplicate: result.duplicate ?? false });
    },
  );

  const createTransactionEndpoint = createEndpoint(
    '/api/create-transaction',
    { method: 'POST' },
    async (c: any) => {
      try {
        const body = await c.request.json();
        
        logger?.debug('Creating transaction', { 
          orderId: body.orderId,
          amount: body.amount,
          currency: body.currency ?? 'IDR' 
        });

        const provider = body.providerId
          ? ctx.providerRegistry.get(body.providerId)
          : ctx.providerRegistry.getDefault();
        if (!provider) {
          logger?.warn('No provider available', { providerId: body.providerId });
          return toResponse({ error: 'No provider available' }, { status: 400 });
        }

        const txn = await ctx.transactionService.create({
          orderId: body.orderId,
          providerId: provider.id,
          amount: body.amount,
          currency: body.currency ?? 'IDR',
          customerEmail: body.customerEmail,
          metadata: body.metadata,
        });

        const result = await provider.createPaymentLink({
          orderId: body.orderId,
          amount: body.amount,
          currency: body.currency ?? 'IDR',
          customerEmail: body.customerEmail,
          customerName: body.customerName,
          description: body.description ?? '',
          callbackUrl: body.callbackUrl ?? '',
          returnUrl: body.returnUrl ?? '',
          paymentMethod: body.paymentMethod,
          metadata: body.metadata,
        });

        await ctx.transactionService.updateStatus(body.orderId, 'active', result.providerTransactionId);

        logger?.info('Transaction created successfully', { 
          orderId: txn.orderId,
          providerId: provider.id,
          status: 'active' 
        });

        return toResponse({
          orderId: txn.orderId,
          providerId: provider.id,
          paymentUrl: result.paymentUrl,
          providerTransactionId: result.providerTransactionId,
          status: 'active',
          amount: result.amount,
          currency: result.currency,
        });
      } catch (error) {
        logger?.error('Failed to create transaction', { 
          error: error instanceof Error ? error.message : String(error) 
        });
        return toResponse({ error: (error as Error).message }, { status: 500 });
      }
    },
  );

  const statusEndpoint = createEndpoint(
    '/api/status/:orderId',
    { method: 'GET' },
    async (c: any) => {
      const orderId = c.params?.orderId ?? c.pathParams?.orderId;
      if (!orderId) {
        return toResponse({ error: 'Missing orderId' }, { status: 400 });
      }
      
      logger?.debug('Checking transaction status', { orderId });
      
      const txn = await ctx.transactionService.getByOrderId(orderId);
      if (!txn) {
        logger?.debug('Transaction not found', { orderId });
        return toResponse({ error: `Transaction not found: ${orderId}` }, { status: 404 });
      }
      
      logger?.debug('Transaction status retrieved', { orderId, status: txn.status });
      
      return toResponse({
        orderId: txn.orderId,
        status: txn.status,
        amount: txn.amount,
        currency: txn.currency,
        providerId: txn.providerId,
        providerTransactionId: txn.providerTransactionId,
      });
    },
  );

  // ── Reconciliation endpoint ────────────────────────────────────────────
  
  const reconcileEndpoint = createEndpoint(
    '/api/reconcile',
    { method: 'POST' },
    async (_c: any) => {
      try {
        logger?.info('Manual reconciliation triggered');
        
        // Trigger reconciliation for all providers
        const results = [];
        for (const provider of ctx.providerRegistry.list()) {
          if ('reconcile' in provider && typeof provider.reconcile === 'function') {
            try {
              const result = await (provider as any).reconcile();
              results.push({ providerId: provider.id, success: true, result });
            } catch (error) {
              logger?.warn('Provider reconciliation failed', { 
                providerId: provider.id, 
                error: error instanceof Error ? error.message : String(error) 
              });
              results.push({ 
                providerId: provider.id, 
                success: false, 
                error: error instanceof Error ? error.message : String(error) 
              });
            }
          }
        }
        
        logger?.info('Reconciliation completed', { 
          totalProviders: results.length,
          successful: results.filter(r => r.success).length 
        });
        
        return toResponse({ 
          success: true, 
          results 
        });
      } catch (error) {
        logger?.error('Reconciliation failed', { 
          error: error instanceof Error ? error.message : String(error) 
        });
        return toResponse({ error: (error as Error).message }, { status: 500 });
      }
    },
  );

  // ── Billing endpoints (only when billing plugin loaded) ────────────────

  const endpoints: Record<string, any> = {
    webhook: webhookEndpoint,
    createTransaction: createTransactionEndpoint,
    status: statusEndpoint,
    reconcile: reconcileEndpoint,
  };

  if (ctx.billing) {
    const billing = ctx.billing;

    endpoints.subscribe = createEndpoint(
      '/api/subscribe',
      { method: 'POST' },
      async (c: any) => {
        try {
          const body = await c.request.json();
          
          logger?.debug('Processing subscription', { 
            customerId: body.customerId, 
            planId: body.planId 
          });
          
          const planDef = billing.products.find((p: any) => p.id === body.planId);
          if (!planDef) {
            logger?.warn('Plan not found', { planId: body.planId });
            return toResponse({ error: `Plan not found: ${body.planId}` }, { status: 404 });
          }

          const sub = await billing.subscription.subscribe({
            customerId: body.customerId,
            plan: planDef,
          }) as any;

          await billing.entitlement.createEntitlements(
            body.customerId,
            sub.id,
            planDef.includes,
          );

          logger?.info('Subscription created', { 
            subscriptionId: sub.id, 
            planId: planDef.id,
            status: sub.status 
          });

          return toResponse({
            subscriptionId: sub.id,
            status: sub.status,
            planId: planDef.id,
          });
        } catch (error) {
          logger?.error('Failed to create subscription', { 
            error: error instanceof Error ? error.message : String(error) 
          });
          return toResponse({ error: (error as Error).message }, { status: 500 });
        }
      },
    );

    endpoints.check = createEndpoint(
      '/api/check',
      { method: 'POST' },
      async (c: any) => {
        try {
          const body = await c.request.json();
          const result = await billing.entitlement.check(body.customerId, body.featureId);
          return toResponse(result);
        } catch (error) {
          return toResponse({ error: (error as Error).message }, { status: 500 });
        }
      },
    );

    endpoints.report = createEndpoint(
      '/api/report',
      { method: 'POST' },
      async (c: any) => {
        try {
          const body = await c.request.json();
          const result = await billing.entitlement.report(body.customerId, body.featureId, body.amount);
          return toResponse(result);
        } catch (error) {
          return toResponse({ error: (error as Error).message }, { status: 500 });
        }
      },
    );

    endpoints.createCustomer = createEndpoint(
      '/api/customer',
      { method: 'POST' },
      async (c: any) => {
        try {
          const body = await c.request.json();
          const customer = await billing.customer.create({
            email: body.email,
            name: body.name,
            phone: body.phone,
          }) as any;
          return toResponse({ id: customer.id, email: customer.email });
        } catch (error) {
          return toResponse({ error: (error as Error).message }, { status: 500 });
        }
      },
    );

    endpoints.invoices = createEndpoint(
      '/api/invoices/:subscriptionId',
      { method: 'GET' },
      async (c: any) => {
        const subscriptionId = c.params?.subscriptionId ?? c.pathParams?.subscriptionId;
        if (!subscriptionId) {
          return toResponse({ error: 'Missing subscriptionId' }, { status: 400 });
        }
        const invoices = await billing.invoice.getBySubscription(subscriptionId);
        return toResponse({ invoices });
      },
    );
  }

  // ── Build router ───────────────────────────────────────────────────────
  const router = createRouter(endpoints, { basePath: '/pay' });
  return router;
}
