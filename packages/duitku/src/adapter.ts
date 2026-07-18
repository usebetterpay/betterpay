// ── Duitku Provider Adapter ──────────────────────────────────────────────
// API: https://sandbox.duitku.com/webapi/api/merchant/...
// Auth: HMAC-SHA256 body signatures (not MD5).

import type {
  PaymentProvider,
  CreatePaymentLinkInput,
  PaymentLinkResult,
  StatusResult,
  WebhookData,
  NormalizedWebhookEvent,
} from '@betterpay/core';
import {
  verifyDuitkuSignature,
  extractDuitkuSignature,
  parseDuitkuPayload,
  signDuitkuInquiry,
  signDuitkuStatus,
} from './signature';

export interface DuitkuConfig {
  apiKey: string;
  merchantCode: string;
  isSandbox?: boolean;
  priority?: number;
  /**
   * Default payment method code (2 chars), e.g. SP (ShopeePay), NQ (QRIS), BC (BCA VA).
   * Overridden per request via CreatePaymentLinkInput.paymentMethod.
   */
  defaultPaymentMethod?: string;
}

/** Map Duitku result/status code → canonical status. */
function mapCallbackStatus(code: string): StatusResult['status'] {
  // Callback: 00 success, 01 failed
  if (code === '00') return 'completed';
  if (code === '01') return 'failed';
  return 'pending';
}

function mapCheckStatus(code: string): StatusResult['status'] {
  // transactionStatus: 00 success, 01 pending, 02 canceled
  if (code === '00') return 'completed';
  if (code === '01') return 'pending';
  if (code === '02') return 'canceled';
  return 'pending';
}

function eventNameForStatus(status: StatusResult['status']): string {
  if (status === 'completed') return 'payment.completed';
  if (status === 'failed') return 'payment.failed';
  if (status === 'canceled') return 'payment.canceled';
  return 'payment.pending';
}

/** Create a Duitku PaymentProvider. */
export function duitkuProvider(config: DuitkuConfig): PaymentProvider & { priority?: number } {
  const isSandbox = config.isSandbox ?? true;
  const baseUrl = isSandbox
    ? 'https://sandbox.duitku.com/webapi/api/merchant'
    : 'https://passport.duitku.com/webapi/api/merchant';

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
      const paymentMethod =
        data.paymentMethod ?? config.defaultPaymentMethod ?? 'SP';
      const signature = signDuitkuInquiry(
        config.merchantCode,
        data.orderId,
        data.amount,
        config.apiKey,
      );

      const body = {
        merchantCode: config.merchantCode,
        paymentAmount: data.amount,
        paymentMethod,
        merchantOrderId: data.orderId,
        productDetails: data.description || `Order ${data.orderId}`,
        customerVaName: (data.customerName ?? data.customerEmail ?? 'Customer').slice(0, 20),
        email: data.customerEmail,
        callbackUrl: data.callbackUrl,
        returnUrl: data.returnUrl,
        signature,
        expiryPeriod: data.expiryMinutes,
      };

      const response = await fetch(`${baseUrl}/v2/inquiry`, {
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
        qrString?: string;
        statusCode?: string;
        statusMessage?: string;
        amount?: string;
      };

      if (result.statusCode && result.statusCode !== '00') {
        throw new Error(
          `Duitku create failed: ${result.statusCode} ${result.statusMessage ?? ''}`.trim(),
        );
      }

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
      const status = mapCallbackStatus(parsed.resultCode);
      return [
        {
          name: eventNameForStatus(status),
          payload: parsed as unknown as Record<string, unknown>,
          providerEventId: parsed.reference || parsed.merchantOrderId,
        },
      ];
    },

    async checkStatus(orderId: string): Promise<StatusResult> {
      const signature = signDuitkuStatus(config.merchantCode, orderId, config.apiKey);

      const response = await fetch(`${baseUrl}/transactionStatus`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchantCode: config.merchantCode,
          merchantOrderId: orderId,
          signature,
        }),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => 'unknown');
        throw new Error(`Duitku status check failed: ${response.status} ${text}`);
      }

      const data = (await response.json()) as {
        reference?: string;
        statusCode?: string;
        amount?: string;
      };

      return {
        providerTransactionId: data.reference ?? '',
        status: mapCheckStatus(data.statusCode ?? ''),
        amount: Number.parseFloat(data.amount ?? '0'),
        currency: 'IDR',
        raw: data,
      };
    },
  };
}
