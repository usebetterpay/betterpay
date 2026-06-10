// ── better-call Router ───────────────────────────────────────────────────
// Exposes BetterPay API endpoints via better-call.

import { createRouter, createEndpoint, toResponse } from 'better-call';
import type { ProviderRegistry } from './provider/registry';
import type { TransactionService } from './transaction/service';
import type { WebhookHandler } from './webhook/handler';

export interface RouterContext {
  providerRegistry: ProviderRegistry;
  transactionService: TransactionService;
  webhookHandler: WebhookHandler;
}

export function createPayRouter(ctx: RouterContext) {
  // ── POST /api/webhook/:providerId ─────────────────────────────────────
  const webhookEndpoint = createEndpoint(
    '/api/webhook/:providerId',
    {
      method: 'POST',
    },
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

      return toResponse({
        success: true,
        event: result.eventName,
        duplicate: result.duplicate ?? false,
      });
    },
  );

  // ── POST /api/create-transaction ───────────────────────────────────────
  const createTransactionEndpoint = createEndpoint(
    '/api/create-transaction',
    {
      method: 'POST',
    },
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

        await ctx.transactionService.updateStatus(
          body.orderId,
          'active',
          result.providerTransactionId,
        );

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
        return toResponse(
          { error: (error as Error).message },
          { status: 500 },
        );
      }
    },
  );

  // ── GET /api/status/:orderId ───────────────────────────────────────────
  const statusEndpoint = createEndpoint(
    '/api/status/:orderId',
    {
      method: 'GET',
    },
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

  // ── Build router ───────────────────────────────────────────────────────
  const router = createRouter(
    {
      webhook: webhookEndpoint,
      createTransaction: createTransactionEndpoint,
      status: statusEndpoint,
    },
    {
      basePath: '/pay',
    },
  );

  return router;
}
