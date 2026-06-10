// ── Duitku Provider Adapter ──────────────────────────────────────────────
// Extracted from wabase DuitkuAdapter, converted to function-based PaymentProvider.

import type {
  PaymentProvider,
  CreatePaymentLinkInput,
  PaymentLinkResult,
  StatusResult,
  WebhookData,
  NormalizedWebhookEvent,
} from '@betterpay/core';
import { createHash } from 'node:crypto';
import { verifyDuitkuSignature, extractDuitkuSignature, parseDuitkuPayload } from './signature';

export interface DuitkuConfig {
  apiKey: string;
  merchantCode: string;
  isSandbox?: boolean;
  priority?: number;
}

/** Map Duitku result code → canonical status. */
function mapStatus(code: string): StatusResult['status'] {
  const map: Record<string, StatusResult['status']> = {
    '00': 'completed',
    '01': 'failed',
    '02': 'canceled',
  };
  return map[code] ?? 'pending';
}

function md5Hex(data: string): string {
  return createHash('md5').update(data).digest('hex');
}

/** Create a Duitku PaymentProvider. */
export function duitkuProvider(config: DuitkuConfig): PaymentProvider & { priority?: number } {
  const isSandbox = config.isSandbox ?? true;
  const baseUrl = isSandbox
    ? 'https://sandbox.duitku.com'
    : 'https://passport.duitku.com';

  return {
    id: 'duitku',
    name: 'Duitku',
    paymentMethods: ['virtual_account', 'ewallet', 'qris', 'retail'],
    capabilities: {
      paymentLink: true,
      recurring: false,
      refund: false,
      virtualAccount: true,
      ewallet: true,
      qris: true,
      retail: true,
    },
    priority: config.priority,

    getApiEndpoint: () => baseUrl,

    async createPaymentLink(data: CreatePaymentLinkInput): Promise<PaymentLinkResult> {
      // Signature: MD5(merchantCode + amount + orderId + apiKey)
      const signature = md5Hex(
        `${config.merchantCode}${data.amount}${data.orderId}${config.apiKey}`,
      );

      const body = {
        merchantCode: config.merchantCode,
        paymentAmount: data.amount,
        paymentMethod: data.paymentMethod ?? 'VA',
        merchantOrderId: data.orderId,
        productDetails: data.description,
        customerVaName: data.customerName ?? data.customerEmail,
        email: data.customerEmail,
        callbackUrl: data.callbackUrl,
        returnUrl: data.returnUrl,
        signature,
      };

      const response = await fetch(`${baseUrl}/webapi/merchant/v2/inquiry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => 'unknown');
        throw new Error(`Duitku create failed: ${response.status} ${text}`);
      }

      const result = (await response.json()) as {
        reference?: string;
        paymentUrl?: string;
        vaNumber?: string;
      };

      return {
        providerTransactionId: result.reference ?? '',
        paymentUrl: result.paymentUrl,
        vaNumber: result.vaNumber,
        amount: data.amount,
        currency: 'IDR',
        status: 'active',
        raw: result,
      };
    },

    async verifyWebhook(data: WebhookData): Promise<boolean> {
      const signature = extractDuitkuSignature(data.body);
      if (!signature) return false;
      return verifyDuitkuSignature(data.body, signature, config.apiKey);
    },

    async normalizeWebhook(data: WebhookData): Promise<NormalizedWebhookEvent[]> {
      const parsed = parseDuitkuPayload(data.body);
      if (!parsed) return [];
      return [
        {
          name: `payment.${mapStatus(parsed.resultCode) === 'completed' ? 'completed' : mapStatus(parsed.resultCode) === 'failed' ? 'failed' : 'canceled'}`,
          payload: parsed as unknown as Record<string, unknown>,
          providerEventId: parsed.reference,
        },
      ];
    },

    async checkStatus(orderId: string): Promise<StatusResult> {
      // Status signature: MD5(merchantCode + merchantOrderId + apiKey)
      const signature = md5Hex(`${config.merchantCode}${orderId}${config.apiKey}`);

      const response = await fetch(`${baseUrl}/webapi/merchant/transactionStatus`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchantCode: config.merchantCode,
          merchantOrderId: orderId,
          signature,
        }),
      });

      if (!response.ok) {
        throw new Error(`Duitku status check failed: ${response.status}`);
      }

      const data = (await response.json()) as {
        reference?: string;
        statusCode?: string;
        amount?: string;
      };

      return {
        providerTransactionId: data.reference ?? '',
        status: mapStatus(data.statusCode ?? ''),
        amount: Number.parseFloat(data.amount ?? '0'),
        currency: 'IDR',
        raw: data,
      };
    },
  };
}
