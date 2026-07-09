// ── SumoPod Payment Provider for BetterPay ───────────────────────────────

import type {
  PaymentProvider,
  PaymentMethod,
  ProviderCapabilities,
  CreatePaymentLinkInput,
  PaymentLinkResult,
  StatusResult,
  WebhookData,
  NormalizedWebhookEvent,
} from '@betterpay/core';
import type {
  SumopodConfig,
  SumopodCreatePaymentRequest,
  SumopodCreatePaymentResponse,
} from './types';
import {
  parseSumopodWebhook,
  sanitizeOrderId,
  verifySumopodWebhook,
} from './signature';

const SANDBOX_BASE = 'https://api-pay-sandbox.sumopod.com/api/v1';
const LIVE_BASE = 'https://api-pay.sumopod.com/api/v1';

export class SumopodProvider implements PaymentProvider {
  public readonly id = 'sumopod';
  public readonly name = 'SumoPod';
  public readonly paymentMethods: PaymentMethod[] = [
    'qris',
    'virtual_account',
    'ewallet',
    'bank_transfer',
  ];
  public readonly capabilities: ProviderCapabilities = {
    paymentLink: true,
    recurring: false,
    refund: false,
    qris: true,
    virtualAccount: true,
    ewallet: true,
  };

  private readonly config: Required<
    Pick<SumopodConfig, 'apiKey' | 'isSandbox'>
  > &
    SumopodConfig;
  private readonly baseUrl: string;
  private readonly fetchFn: typeof fetch;

  constructor(config: SumopodConfig) {
    if (!config.apiKey?.trim()) {
      throw new Error('sumopod: apiKey is required');
    }
    if (!config.webhookSecret && !config.webhookToken) {
      // Allow construct without webhook secrets for create-only tests,
      // but verifyWebhook will fail closed.
    }
    this.config = {
      ...config,
      apiKey: config.apiKey.trim(),
      isSandbox: config.isSandbox ?? true,
    };
    if (config.baseUrl) {
      if (!config.baseUrl.startsWith('https://')) {
        throw new Error('sumopod: baseUrl must use https://');
      }
      this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    } else {
      this.baseUrl = this.config.isSandbox ? SANDBOX_BASE : LIVE_BASE;
    }
    this.fetchFn = config.fetch ?? globalThis.fetch;
  }

  getApiEndpoint(): string {
    return this.baseUrl;
  }

  async createPaymentLink(params: CreatePaymentLinkInput): Promise<PaymentLinkResult> {
    const orderId = sanitizeOrderId(params.orderId);
    const body: SumopodCreatePaymentRequest = {
      order_id: orderId,
      amount: Math.trunc(params.amount),
      currency: 'IDR',
    };

    if (params.expiryMinutes && params.expiryMinutes > 0) {
      body.expires_in_hours = Math.max(1, Math.ceil(params.expiryMinutes / 60));
    }

    const success = httpsOnly(params.returnUrl) ?? httpsOnly(params.callbackUrl);
    const cancel = httpsOnly(params.callbackUrl) ?? httpsOnly(params.returnUrl);
    if (success) body.success_return_url = success;
    if (cancel) body.cancel_return_url = cancel;

    const response = await this.fetchFn(`${this.baseUrl}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.config.apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`SumoPod create payment failed (${response.status}): ${text}`);
    }

    const data = (await response.json()) as SumopodCreatePaymentResponse;
    if (!data.payment_id) {
      throw new Error('SumoPod create payment returned no payment_id');
    }

    return {
      providerTransactionId: data.payment_id,
      paymentUrl: data.payment_link_url ?? undefined,
      amount: data.amount ?? params.amount,
      currency: data.currency ?? 'IDR',
      expiresAt: data.expires_at ?? undefined,
      status: mapPaymentStatus(data.status),
      raw: data,
    };
  }

  async verifyWebhook(data: WebhookData): Promise<boolean> {
    return verifySumopodWebhook(data.body, data.headers, {
      webhookSecret: this.config.webhookSecret,
      webhookToken: this.config.webhookToken,
      toleranceSeconds: this.config.webhookToleranceSeconds,
    });
  }

  async normalizeWebhook(data: WebhookData): Promise<NormalizedWebhookEvent[]> {
    const payload = parseSumopodWebhook(data.body);
    const name = mapWebhookEvent(payload.event_type);
    const d = payload.data;

    // BetterPay webhook handler looks for order_id / orderId / reference_id
    const normalizedPayload: Record<string, unknown> = {
      ...d,
      order_id: d.order_id,
      orderId: d.order_id,
      payment_id: d.payment_id,
      amount: d.amount,
      status: d.status,
      payment_method: d.payment_method,
      event_type: payload.event_type,
    };

    const providerEventId =
      d.payment_id && payload.event_type
        ? `${payload.event_type}:${d.payment_id}`
        : undefined;

    return [
      {
        name,
        payload: normalizedPayload,
        providerEventId,
      },
    ];
  }

  /**
   * SumoPod sandbox currently exposes create + webhooks; no public GET status
   * route. Prefer webhooks / reconciliation will no-op until status API ships.
   */
  async checkStatus(providerTransactionId: string): Promise<StatusResult> {
    throw new Error(
      `SumoPod checkStatus is not available yet (payment_id=${providerTransactionId}). Use webhooks for status updates.`,
    );
  }
}

function httpsOnly(url: string | undefined): string | undefined {
  if (!url) return undefined;
  const t = url.trim();
  if (!t.startsWith('https://')) return undefined;
  return t;
}

function mapWebhookEvent(eventType: string): string {
  const map: Record<string, string> = {
    'payment.completed': 'payment.completed',
    'payment.failed': 'payment.failed',
    'payment.expired': 'payment.expired',
    'payment.test': 'payment.pending',
  };
  return map[eventType] ?? 'payment.updated';
}

function mapPaymentStatus(
  status: string | undefined,
): PaymentLinkResult['status'] {
  if (!status) return 'pending';
  const s = status.toLowerCase();
  const map: Record<string, PaymentLinkResult['status']> = {
    pending: 'pending',
    active: 'active',
    completed: 'completed',
    paid: 'completed',
    success: 'completed',
    expired: 'expired',
    failed: 'failed',
    canceled: 'canceled',
    cancelled: 'canceled',
  };
  return map[s] ?? 'pending';
}

export function sumopodProvider(config: SumopodConfig): PaymentProvider {
  return new SumopodProvider(config);
}
