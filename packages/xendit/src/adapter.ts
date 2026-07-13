// ── Xendit Provider Adapter ──────────────────────────────────────────────
// Uses Invoice API (hosted checkout). Payment Sessions is not enabled on all accounts.

import type {
  PaymentProvider,
  CreatePaymentLinkInput,
  PaymentLinkResult,
  StatusResult,
  WebhookData,
  NormalizedWebhookEvent,
} from '@betterpay/core';
import { verifyXenditSignature, extractXenditSignature } from './signature';

export interface XenditConfig {
  apiKey: string;
  /** Callback token from Xendit dashboard (x-callback-token) and/or webhook verification token. */
  webhookSecret?: string;
  isSandbox?: boolean;
  priority?: number;
}

/** Map Xendit invoice / payment status → canonical BetterPay status. */
function mapStatus(xenditStatus: string): StatusResult['status'] {
  const map: Record<string, StatusResult['status']> = {
    PENDING: 'active',
    ACTIVE: 'active',
    PAID: 'completed',
    SETTLED: 'completed',
    COMPLETED: 'completed',
    SUCCEEDED: 'completed',
    FAILED: 'failed',
    EXPIRED: 'expired',
    CANCELLED: 'canceled',
    CANCELED: 'canceled',
    REFUNDED: 'canceled',
  };
  return map[xenditStatus.toUpperCase()] ?? 'pending';
}

function eventNameFromStatus(status: StatusResult['status']): string {
  if (status === 'completed') return 'payment.completed';
  if (status === 'expired') return 'payment.expired';
  if (status === 'failed') return 'payment.failed';
  if (status === 'canceled') return 'payment.failed';
  return 'payment.pending';
}

/** Create a Xendit PaymentProvider. */
export function xenditProvider(config: XenditConfig): PaymentProvider & { priority?: number } {
  // Same host for test + live; environment is encoded in the API key prefix.
  const baseUrl = 'https://api.xendit.co';
  const authHeader = `Basic ${Buffer.from(`${config.apiKey}:`).toString('base64')}`;

  return {
    id: 'xendit',
    name: 'Xendit',
    paymentMethods: ['virtual_account', 'ewallet', 'qris', 'credit_card', 'retail', 'paylater'],
    capabilities: {
      paymentLink: true,
      recurring: true,
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
      const expirySeconds = Math.max(60, (data.expiryMinutes ?? 60) * 60);
      const body = {
        external_id: data.orderId,
        amount: data.amount,
        currency: data.currency || 'IDR',
        description: data.description ?? data.orderId,
        invoice_duration: expirySeconds,
        customer: {
          given_names: data.customerName ?? data.customerEmail,
          email: data.customerEmail,
        },
        success_redirect_url: data.returnUrl,
        failure_redirect_url: data.returnUrl,
        items: data.items?.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
        })),
        metadata: data.metadata ?? {},
      };

      const response = await fetch(`${baseUrl}/v2/invoices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => 'unknown');
        throw new Error(`Xendit create failed: ${response.status} ${text}`);
      }

      const result = (await response.json()) as {
        id?: string;
        invoice_url?: string;
        amount?: number;
        currency?: string;
        status?: string;
        external_id?: string;
      };

      return {
        providerTransactionId: result.id ?? '',
        paymentUrl: result.invoice_url,
        amount: result.amount ?? data.amount,
        currency: result.currency ?? data.currency,
        status: mapStatus(result.status ?? 'PENDING'),
        raw: result,
      };
    },

    async verifyWebhook(data: WebhookData): Promise<boolean> {
      if (!config.webhookSecret) {
        // Dogfood / optional auth — accept when no secret configured.
        return true;
      }

      // Classic invoice callbacks send x-callback-token (plain token match).
      const callbackToken =
        data.headers['x-callback-token'] ||
        data.headers['X-Callback-Token'] ||
        data.headers['X-CALLBACK-TOKEN'];
      if (callbackToken) {
        return callbackToken === config.webhookSecret;
      }

      // Some webhook products use body HMAC + x-callback-token style headers.
      const signature = extractXenditSignature(data.headers);
      if (!signature) return false;
      return verifyXenditSignature(data.body, signature, config.webhookSecret);
    },

    async normalizeWebhook(data: WebhookData): Promise<NormalizedWebhookEvent[]> {
      try {
        const parsed = JSON.parse(data.body) as Record<string, unknown>;
        // Invoice webhook: status PAID | EXPIRED | PENDING …
        // Also support nested payment objects / event wrappers.
        const rawStatus = String(
          parsed.status ??
            (parsed.data as Record<string, unknown> | undefined)?.status ??
            parsed.event ??
            parsed.event_type ??
            'unknown',
        );
        const status = mapStatus(rawStatus.replace(/^invoice\./i, '').replace(/^payment\./i, ''));

        return [
          {
            name: eventNameFromStatus(status),
            payload: {
              ...parsed,
              // Normalize ids used by dogfood finalizePayment
              id: parsed.id ?? (parsed.data as Record<string, unknown> | undefined)?.id,
              reference_id:
                parsed.external_id ??
                parsed.reference_id ??
                (parsed.data as Record<string, unknown> | undefined)?.external_id,
              external_id: parsed.external_id,
            },
            providerEventId: String(parsed.id ?? parsed.external_id ?? ''),
          },
        ];
      } catch {
        return [];
      }
    },

    async checkStatus(providerTransactionId: string): Promise<StatusResult> {
      const response = await fetch(`${baseUrl}/v2/invoices/${providerTransactionId}`, {
        headers: { Authorization: authHeader },
      });

      if (!response.ok) {
        throw new Error(`Xendit status check failed: ${response.status}`);
      }

      const data = (await response.json()) as {
        id?: string;
        status?: string;
        amount?: number;
        currency?: string;
        paid_at?: string;
      };

      return {
        providerTransactionId: data.id ?? providerTransactionId,
        status: mapStatus(data.status ?? ''),
        amount: data.amount ?? 0,
        currency: data.currency ?? 'IDR',
        paidAt: data.paid_at,
        raw: data,
      };
    },

    async cancelTransaction(providerTransactionId: string): Promise<void> {
      const response = await fetch(`${baseUrl}/invoices/${providerTransactionId}/expire!`, {
        method: 'POST',
        headers: { Authorization: authHeader },
      });

      if (!response.ok) {
        throw new Error(`Xendit cancel failed: ${response.status}`);
      }
    },
  };
}
