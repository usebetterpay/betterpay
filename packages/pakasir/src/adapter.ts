// ── Pakasir Provider Adapter ─────────────────────────────────────────────
// Extracted from wabase PakasirAdapter, converted to function-based PaymentProvider.

import type {
  PaymentProvider,
  CreatePaymentLinkInput,
  PaymentLinkResult,
  StatusResult,
  WebhookData,
  NormalizedWebhookEvent,
} from '@betterpay/core';
import { verifyPakasirSignature, parsePakasirPayload } from './signature';

export interface PakasirConfig {
  apiKey: string;
  projectSlug: string;
  isSandbox?: boolean;
  priority?: number;
}

/** Map Pakasir status → canonical status. */
function mapStatus(pakasirStatus: string): StatusResult['status'] {
  const map: Record<string, StatusResult['status']> = {
    pending: 'active',
    processing: 'active',
    completed: 'completed',
    success: 'completed',
    failed: 'failed',
    expired: 'expired',
    canceled: 'canceled',
  };
  return map[pakasirStatus.toLowerCase()] ?? 'pending';
}

/** Create a Pakasir PaymentProvider. */
export function pakasirProvider(config: PakasirConfig): PaymentProvider & { priority?: number } {
  const baseUrl = 'https://pakasir.com';

  return {
    id: 'pakasir',
    name: 'Pakasir',
    paymentMethods: ['qris'],
    capabilities: {
      paymentLink: true,
      recurring: false,
      refund: false,
      qris: true,
    },
    priority: config.priority,

    getApiEndpoint: () => baseUrl,

    async createPaymentLink(data: CreatePaymentLinkInput): Promise<PaymentLinkResult> {
      const body = {
        project: config.projectSlug,
        order_id: data.orderId,
        amount: data.amount,
        api_key: config.apiKey,
      };

      const response = await fetch(`${baseUrl}/api/transaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => 'unknown');
        throw new Error(`Pakasir create failed: ${response.status} ${text}`);
      }

      const result = (await response.json()) as {
        payment_url?: string;
        qr_code?: string;
      };

      return {
        providerTransactionId: data.orderId, // Pakasir uses order_id as tx ID
        paymentUrl: result.payment_url,
        qrString: result.qr_code,
        amount: data.amount,
        currency: data.currency,
        status: 'active',
        raw: result,
      };
    },

    async verifyWebhook(data: WebhookData): Promise<boolean> {
      return verifyPakasirSignature(data.body, '', config.projectSlug);
    },

    async normalizeWebhook(data: WebhookData): Promise<NormalizedWebhookEvent[]> {
      const parsed = parsePakasirPayload(data.body);
      if (!parsed) return [];
      const mapped = mapStatus(parsed.status);
      return [
        {
          name: `payment.${mapped === 'completed' ? 'completed' : mapped === 'expired' ? 'expired' : mapped === 'failed' ? 'failed' : 'pending'}`,
          payload: parsed as unknown as Record<string, unknown>,
          providerEventId: parsed.orderId,
        },
      ];
    },

    async checkStatus(orderId: string): Promise<StatusResult> {
      const url = `${baseUrl}/api/transaction/status?order_id=${orderId}&project=${config.projectSlug}`;
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Pakasir status check failed: ${response.status}`);
      }

      const data = (await response.json()) as {
        order_id?: string;
        status?: string;
        amount?: number;
      };

      return {
        providerTransactionId: data.order_id ?? '',
        status: mapStatus(data.status ?? ''),
        amount: data.amount ?? 0,
        currency: 'IDR',
        raw: data,
      };
    },
  };
}
