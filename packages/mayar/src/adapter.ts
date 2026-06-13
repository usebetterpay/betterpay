// ── Mayar Payment Provider for BetterPay ───────────────────────────────────

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
import type { MayarConfig, MayarWebhookPayload, MayarCreatePaymentResponse } from './types';
import { verifyMayarWebhook, parseMayarWebhook } from './signature';

export class MayarProvider implements PaymentProvider {
  public readonly id = 'mayar';
  public readonly name = 'Mayar';
  public readonly paymentMethods: PaymentMethod[] = [
    'virtual_account',
    'ewallet',
    'qris',
    'credit_card',
    'retail',
  ];
  public readonly capabilities: ProviderCapabilities = {
    paymentLink: true,
    recurring: false,
    refund: false,
    virtualAccount: true,
    ewallet: true,
    qris: true,
    creditCard: true,
    retail: true,
  };

  private config: MayarConfig;

  constructor(config: MayarConfig) {
    this.config = config;
  }

  /**
   * Get the Mayar API base URL based on environment.
   */
  getApiEndpoint(): string {
    return this.config.isSandbox
      ? 'https://api.mayar.club/hl/v1'
      : 'https://api.mayar.id/hl/v1';
  }

  /**
   * Create a payment link via Mayar's single payment request API.
   */
  async createPaymentLink(params: CreatePaymentLinkInput): Promise<PaymentLinkResult> {
    const body = {
      name: params.customerName || params.customerEmail,
      email: params.customerEmail,
      amount: params.amount,
      mobile: params.customerPhone,
      redirectUrl: params.returnUrl || params.callbackUrl,
      description: params.description || `Payment for ${params.orderId}`,
      expiredAt: params.expiryMinutes
        ? new Date(Date.now() + params.expiryMinutes * 60_000).toISOString()
        : undefined,
    };

    const response = await fetch(`${this.getApiEndpoint()}/payment/create`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Mayar create payment failed (${response.status}): ${errorText}`);
    }

    const result = (await response.json()) as MayarCreatePaymentResponse;
    const data = result.data?.[0];

    if (!data) {
      throw new Error('Mayar create payment returned no data');
    }

    return {
      providerTransactionId: data.transactionId || data.id,
      paymentUrl: data.paymentLink,
      amount: params.amount,
      currency: params.currency || 'IDR',
      status: 'active',
      raw: result,
    };
  }

  /**
   * Verify webhook by checking merchantId (Mayar has no HMAC signature).
   */
  async verifyWebhook(data: WebhookData): Promise<boolean> {
    return verifyMayarWebhook(data.body, this.config.merchantId);
  }

  /**
   * Normalize Mayar webhook events to BetterPay format.
   */
  async normalizeWebhook(data: WebhookData): Promise<NormalizedWebhookEvent[]> {
    const payload = parseMayarWebhook(data.body);
    const eventName = this.mapWebhookEvent(payload);

    return [
      {
        name: eventName,
        payload: payload.data as unknown as Record<string, unknown>,
        providerEventId: `${payload.event.received}-${payload.data.id}`,
      },
    ];
  }

  /**
   * Check transaction status.
   */
  async checkStatus(providerTransactionId: string): Promise<StatusResult> {
    const response = await fetch(
      `${this.getApiEndpoint()}/payment/detail/${providerTransactionId}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Mayar check status failed (${response.status})`);
    }

    const result = (await response.json()) as { data?: Array<{ transactionId?: string; status?: string; amount?: number }> };
    const data = result.data?.[0];

    return {
      providerTransactionId: data?.transactionId || providerTransactionId,
      status: this.mapStatus(data?.status),
      amount: data?.amount ?? 0,
      currency: 'IDR',
      raw: result,
    };
  }

  /**
   * Map Mayar webhook event to BetterPay event name.
   */
  private mapWebhookEvent(payload: MayarWebhookPayload): string {
    const event = payload.event.received;

    const eventMap: Record<string, string> = {
      'payment.received': 'payment.completed',
      'payment.reminder': 'payment.pending',
      'membership.newMemberRegistered': 'subscription.created',
      'membership.memberUnsubscribed': 'subscription.canceled',
      'membership.memberExpired': 'subscription.expired',
      'membership.changeTierMemberRegistered': 'subscription.updated',
    };

    return eventMap[event] || 'payment.updated';
  }

  /**
   * Map Mayar payment status to BetterPay status.
   * Mayar uses: unpaid, paid, expired, closed
   */
  private mapStatus(status: string | undefined): 'pending' | 'active' | 'completed' | 'expired' | 'canceled' | 'failed' {
    if (!status) return 'pending';

    const statusMap: Record<string, 'pending' | 'active' | 'completed' | 'expired' | 'canceled' | 'failed'> = {
      unpaid: 'pending',
      paid: 'completed',
      expired: 'expired',
      closed: 'canceled',
      success: 'completed',
      failed: 'failed',
    };

    return statusMap[status.toLowerCase()] || 'pending';
  }
}

/**
 * Create a Mayar provider instance (function-style, for direct use).
 */
export function mayarProvider(config: MayarConfig): PaymentProvider & { priority?: number } {
  return new MayarProvider(config);
}
