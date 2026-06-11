// ── better-call Router ───────────────────────────────────────────────────
// Exposes BetterPay API endpoints via better-call.
// Includes optional billing endpoints when billing plugin is loaded.

import { createRouter, createEndpoint, toResponse } from 'better-call';
import type { ProviderRegistry } from './provider/registry';
import type { TransactionService } from './transaction/service';
import type { WebhookHandler } from './webhook/handler';
import type { BillingPluginData } from './billing-bridge';

export interface RouterContext {
  providerRegistry: ProviderRegistry;
  transactionService: TransactionService;
  webhookHandler: WebhookHandler;
  billing?: BillingPluginData | null;
}

export function createPayRouter(ctx: RouterContext) {
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

      const result = await ctx.webhookHandler.handle(providerId, { body, headers });
      if (!result.success) {
        return toResponse({ error: result.error }, { status: 400 });
      }

      return toResponse({ success: true, event: result.eventName, duplicate: result.duplicate ?? false });
    },
  );

  const createTransactionEndpoint = createEndpoint(
    '/api/create-transaction',
    { method: 'POST' },
    async (c: any) => {
      try {
        const body = await c.request.json();
        const provider = body.providerId
          ? ctx.providerRegistry.get(body.providerId)
          : ctx.providerRegistry.getDefault();
        if (!provider) {
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
      const txn = await ctx.transactionService.getByOrderId(orderId);
      if (!txn) {
        return toResponse({ error: `Transaction not found: ${orderId}` }, { status: 404 });
      }
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

  // ── Billing endpoints (only when billing plugin loaded) ────────────────

  const endpoints: Record<string, any> = {
    webhook: webhookEndpoint,
    createTransaction: createTransactionEndpoint,
    status: statusEndpoint,
  };

  if (ctx.billing) {
    const billing = ctx.billing;

    endpoints.subscribe = createEndpoint(
      '/api/subscribe',
      { method: 'POST' },
      async (c: any) => {
        try {
          const body = await c.request.json();
          const planDef = billing.products.find((p: any) => p.id === body.planId);
          if (!planDef) {
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

          return toResponse({
            subscriptionId: sub.id,
            status: sub.status,
            planId: planDef.id,
          });
        } catch (error) {
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
