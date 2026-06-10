// ── Midtrans Provider Adapter ────────────────────────────────────────────
// Extracted from wabase MidtransAdapter, converted to function-based PaymentProvider.

import type {
  PaymentProvider,
  CreatePaymentLinkInput,
  PaymentLinkResult,
  StatusResult,
  WebhookData,
  NormalizedWebhookEvent,
} from '@betterpay/core';
import { verifyMidtransSignature, extractMidtransSignature } from './signature';

export interface MidtransConfig {
  serverKey: string;
  clientKey?: string;
  isSandbox?: boolean;
  priority?: number;
}

/** Map Midtrans status → canonical BetterPay status. */
function mapStatus(midtransStatus: string): StatusResult['status'] {
  const map: Record<string, StatusResult['status']> = {
    capture: 'completed',
    settlement: 'completed',
    pending: 'active',
    deny: 'failed',
    cancel: 'canceled',
    expire: 'expired',
    failure: 'failed',
  };
  return map[midtransStatus.toLowerCase()] ?? 'pending';
}

/** Create a Midtrans PaymentProvider. */
export function midtransProvider(config: MidtransConfig): PaymentProvider & { priority?: number } {
  const isSandbox = config.isSandbox ?? true;
  const baseUrl = isSandbox
    ? 'https://api.sandbox.midtrans.com'
    : 'https://api.midtrans.com';

  const authHeader = `Basic ${Buffer.from(`${config.serverKey}:`).toString('base64')}`;

  return {
    id: 'midtrans',
    name: 'Midtrans',
    paymentMethods: ['virtual_account', 'ewallet', 'qris', 'credit_card', 'retail', 'paylater'],
    capabilities: {
      paymentLink: true,
      recurring: false, // CC recurring needs special MID
      refund: true,
      virtualAccount: true,
      ewallet: true,
      qris: true,
      creditCard: true,
      retail: true,
      paylater: true,
    },
    priority: config.priority,

    getApiEndpoint: () => baseUrl,

    async createPaymentLink(data: CreatePaymentLinkInput): Promise<PaymentLinkResult> {
      const body = {
        transaction_details: {
          order_id: data.orderId,
          gross_amount: data.amount,
        },
        customer_details: {
          email: data.customerEmail,
          first_name: data.customerName ?? data.customerEmail,
        },
        item_details:
          data.items?.map((item) => ({
            id: item.name,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
          })) ?? [],
        callbacks: { finish: data.returnUrl },
      };

      const response = await fetch(`${baseUrl}/snap/v1/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => 'unknown');
        throw new Error(`Midtrans create failed: ${response.status} ${text}`);
      }

      const result = (await response.json()) as { token?: string; redirect_url?: string };

      return {
        providerTransactionId: result.token ?? '',
        paymentUrl: result.redirect_url,
        amount: data.amount,
        currency: data.currency,
        status: 'active',
        raw: result,
      };
    },

    async verifyWebhook(data: WebhookData): Promise<boolean> {
      const signature = extractMidtransSignature(data.body);
      if (!signature) return false;
      return verifyMidtransSignature(data.body, signature, config.serverKey);
    },

    async normalizeWebhook(data: WebhookData): Promise<NormalizedWebhookEvent[]> {
      try {
        const parsed = JSON.parse(data.body) as Record<string, string>;
        const eventType = parsed.transaction_status ?? parsed.status ?? 'unknown';

        return [
          {
            name: `payment.${mapStatus(eventType) === 'completed' ? 'completed' : mapStatus(eventType) === 'expired' ? 'expired' : mapStatus(eventType) === 'failed' ? 'failed' : mapStatus(eventType) === 'canceled' ? 'canceled' : 'pending'}`,
            payload: parsed as unknown as Record<string, unknown>,
            providerEventId: parsed.transaction_id,
          },
        ];
      } catch {
        return [];
      }
    },

    async checkStatus(providerTransactionId: string): Promise<StatusResult> {
      const response = await fetch(`${baseUrl}/v2/${providerTransactionId}/status`, {
        headers: { Accept: 'application/json', Authorization: authHeader },
      });

      if (!response.ok) {
        throw new Error(`Midtrans status check failed: ${response.status}`);
      }

      const data = (await response.json()) as {
        transaction_id?: string;
        transaction_status?: string;
        gross_amount?: string;
        currency?: string;
      };

      return {
        providerTransactionId: data.transaction_id ?? '',
        status: mapStatus(data.transaction_status ?? ''),
        amount: Number.parseFloat(data.gross_amount ?? '0'),
        currency: data.currency ?? 'IDR',
        raw: data,
      };
    },

    async cancelTransaction(providerTransactionId: string): Promise<void> {
      const response = await fetch(`${baseUrl}/v2/${providerTransactionId}/cancel`, {
        method: 'POST',
        headers: { Accept: 'application/json', Authorization: authHeader },
      });

      if (!response.ok) {
        throw new Error(`Midtrans cancel failed: ${response.status}`);
      }
    },
  };
}
