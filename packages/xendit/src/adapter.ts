// ── Xendit Provider Adapter ──────────────────────────────────────────────
// Extracted from wabase XenditAdapter, converted to function-based PaymentProvider.

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
  webhookSecret?: string;
  isSandbox?: boolean;
  priority?: number;
}

/** Map Xendit status → canonical BetterPay status. */
function mapStatus(xenditStatus: string): StatusResult['status'] {
  const map: Record<string, StatusResult['status']> = {
    PENDING: 'active',
    ACTIVE: 'active',
    COMPLETED: 'completed',
    SUCCEEDED: 'completed',
    FAILED: 'failed',
    EXPIRED: 'expired',
    CANCELLED: 'canceled',
    REFUNDED: 'canceled',
  };
  return map[xenditStatus.toUpperCase()] ?? 'pending';
}

/** Create a Xendit PaymentProvider. */
export function xenditProvider(config: XenditConfig): PaymentProvider & { priority?: number } {
  // Xendit uses the same host for sandbox and production; env is determined by API key.
  const baseUrl = 'https://api.xendit.co';
  const authHeader = `Basic ${Buffer.from(`${config.apiKey}:`).toString('base64')}`;

  return {
    id: 'xendit',
    name: 'Xendit',
    paymentMethods: ['virtual_account', 'ewallet', 'qris', 'credit_card', 'retail', 'paylater'],
    capabilities: {
      paymentLink: true,
      recurring: true, // Xendit has native subscription support
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
        reference_id: data.orderId,
        amount: data.amount,
        currency: data.currency,
        description: data.description,
        customer: {
          email: data.customerEmail,
          given_names: data.customerName ?? data.customerEmail,
        },
        success_return_url: data.returnUrl,
        failure_return_url: data.returnUrl,
        metadata: data.metadata ?? {},
      };

      const response = await fetch(`${baseUrl}/payment_sessions`, {
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
        payment_url?: string;
        amount?: number;
        currency?: string;
      };

      return {
        providerTransactionId: result.id ?? '',
        paymentUrl: result.payment_url,
        amount: result.amount ?? data.amount,
        currency: result.currency ?? data.currency,
        status: 'active',
        raw: result,
      };
    },

    async verifyWebhook(data: WebhookData): Promise<boolean> {
      if (!config.webhookSecret) {
        throw new Error('Xendit webhook secret not configured');
      }
      const signature = extractXenditSignature(data.headers);
      if (!signature) return false;
      return verifyXenditSignature(data.body, signature, config.webhookSecret);
    },

    async normalizeWebhook(data: WebhookData): Promise<NormalizedWebhookEvent[]> {
      try {
        const parsed = JSON.parse(data.body) as Record<string, unknown>;
        const rawStatus = String(parsed.status ?? parsed.event_type ?? 'unknown');

        return [
          {
            name: `payment.${mapStatus(rawStatus) === 'completed' ? 'completed' : mapStatus(rawStatus) === 'expired' ? 'expired' : mapStatus(rawStatus) === 'failed' ? 'failed' : 'pending'}`,
            payload: parsed,
            providerEventId: parsed.id as string | undefined,
          },
        ];
      } catch {
        return [];
      }
    },

    async checkStatus(providerTransactionId: string): Promise<StatusResult> {
      const response = await fetch(`${baseUrl}/payment_sessions/${providerTransactionId}`, {
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
      };

      return {
        providerTransactionId: data.id ?? '',
        status: mapStatus(data.status ?? ''),
        amount: data.amount ?? 0,
        currency: data.currency ?? 'IDR',
        raw: data,
      };
    },

    async cancelTransaction(providerTransactionId: string): Promise<void> {
      const response = await fetch(
        `${baseUrl}/payment_sessions/${providerTransactionId}/cancel`,
        {
          method: 'POST',
          headers: { Authorization: authHeader },
        },
      );

      if (!response.ok) {
        throw new Error(`Xendit cancel failed: ${response.status}`);
      }
    },
  };
}
