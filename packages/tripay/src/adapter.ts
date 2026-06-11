import type { PaymentProvider, CreatePaymentLinkInput, PaymentLinkResult, WebhookData, NormalizedWebhookEvent, StatusResult, PaymentMethod, ProviderCapabilities } from '@betterpay/core';
import type {
  TripayConfig,
  TripayPaymentChannel,
  TripayTransactionRequest,
  TripayTransactionResponse,
  TripayCallbackPayload,
} from './types';
import { generateTransactionSignature, verifyCallbackSignature } from './signature';

/**
 * Webhook verification result
 */
export interface WebhookVerificationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Tripay Payment Provider
 *
 * @example
 * ```typescript
 * import { TripayProvider } from '@betterpay/tripay';
 *
 * const tripay = new TripayProvider({
 *   apiKey: 'your_api_key',
 *   privateKey: 'your_private_key',
 *   merchantCode: 'T0001',
 *   isSandbox: true,
 * });
 * ```
 */
export class TripayProvider implements PaymentProvider {
  public readonly id = 'tripay';
  public readonly name = 'Tripay';

  private config: TripayConfig;
  private baseUrl: string;

  constructor(config: TripayConfig) {
    this.config = {
      isSandbox: true,
      ...config,
    };

    this.baseUrl = this.config.isSandbox
      ? 'https://tripay.co.id/api-sandbox'
      : 'https://tripay.co.id/api';
  }

  public readonly paymentMethods: PaymentMethod[] = [
    'virtual_account',
    'ewallet',
    'qris',
    'retail',
  ];

  public readonly capabilities: ProviderCapabilities = {
    paymentLink: true,
    recurring: false,
    refund: false,
    virtualAccount: true,
    ewallet: true,
    qris: true,
    retail: true,
  };

  /**
   * Get API endpoint URL
   */
  getApiEndpoint(): string {
    return this.baseUrl;
  }

  /**
   * Get list of available payment channels
   */
  async getPaymentChannels(): Promise<TripayPaymentChannel[]> {
    const response = await fetch(`${this.baseUrl}/merchant/payment-channel`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
    });

    const data = (await response.json()) as { success: boolean; message?: string; data: TripayPaymentChannel[] };

    if (!data.success) {
      throw new Error(`Tripay API Error: ${data.message}`);
    }

    return data.data;
  }

  /**
   * Create a new payment transaction
   */
  async createPaymentLink(params: CreatePaymentLinkInput): Promise<PaymentLinkResult> {
    const signature = generateTransactionSignature(
      this.config.merchantCode,
      params.orderId,
      params.amount,
      this.config.privateKey
    );

    const request: TripayTransactionRequest = {
      method: params.paymentMethod || 'BRIVA',
      merchant_ref: params.orderId,
      amount: params.amount,
      customer_name: params.customerName || 'Customer',
      customer_email: params.customerEmail,
      customer_phone: params.customerPhone,
      order_items: params.items || [
        {
          name: 'Payment',
          price: params.amount,
          quantity: 1,
        },
      ],
      callback_url: params.callbackUrl,
      return_url: params.returnUrl,
      expired_time: params.expiryMinutes ? Math.floor(Date.now() / 1000) + (params.expiryMinutes * 60) : undefined,
      signature,
    };

    const response = await fetch(`${this.baseUrl}/transaction/create`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    const data = (await response.json()) as TripayTransactionResponse;

    if (!data.success || !data.data) {
      throw new Error(`Tripay API Error: ${data.message}`);
    }

    return {
      providerTransactionId: data.data.reference,
      paymentUrl: data.data.pay_url || data.data.checkout_url,
      vaNumber: data.data.pay_code,
      qrString: data.data.qr_string,
      amount: data.data.amount,
      currency: 'IDR',
      status: this.mapStatus(data.data.status),
      raw: data.data,
    };
  }

  /**
   * Get transaction details
   */
  async getTransaction(reference: string): Promise<TripayTransactionResponse> {
    const response = await fetch(
      `${this.baseUrl}/transaction/detail?reference=${encodeURIComponent(reference)}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
      }
    );

    const data = (await response.json()) as TripayTransactionResponse;

    if (!data.success) {
      throw new Error(`Tripay API Error: ${data.message}`);
    }

    return data;
  }

  /**
   * Check transaction status
   */
  async checkStatus(providerTransactionId: string): Promise<StatusResult> {
    const response = await fetch(
      `${this.baseUrl}/transaction/detail?reference=${encodeURIComponent(providerTransactionId)}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
      }
    );

    const data = (await response.json()) as TripayTransactionResponse;

    if (!data.success || !data.data) {
      throw new Error(`Tripay API Error: ${data.message}`);
    }

    return {
      providerTransactionId: data.data.reference,
      status: this.mapStatus(data.data.status),
      amount: data.data.amount,
      currency: 'IDR',
      paidAt: data.data.paid_at ? new Date(data.data.paid_at * 1000).toISOString() : undefined,
      raw: data.data,
    };
  }

  /**
   * Verify webhook callback signature
   */
  async verifyWebhook(data: WebhookData): Promise<boolean> {
    const signature = data.headers['x-callback-signature'];
    const event = data.headers['x-callback-event'];

    if (!signature || event !== 'payment_status') {
      return false;
    }

    return verifyCallbackSignature(
      data.body,
      signature,
      this.config.privateKey
    );
  }

  /**
   * Normalize webhook payload to BetterPay format
   */
  async normalizeWebhook(data: WebhookData): Promise<NormalizedWebhookEvent[]> {
    const payload = this.parseWebhook(data.body);
    
    const eventName = this.mapWebhookEvent(payload.status);
    
    return [
      {
        name: eventName,
        payload: payload as unknown as Record<string, unknown>,
        providerEventId: payload.reference,
      },
    ];
  }

  /**
   * Map Tripay webhook status to BetterPay event name
   */
  private mapWebhookEvent(status: string): string {
    const eventMap: Record<string, string> = {
      PAID: 'payment.completed',
      EXPIRED: 'payment.expired',
      FAILED: 'payment.failed',
      REFUND: 'payment.refunded',
    };

    return eventMap[status] || 'payment.updated';
  }

  /**
   * Parse webhook callback payload
   */
  parseWebhook(payload: string): TripayCallbackPayload {
    return JSON.parse(payload) as TripayCallbackPayload;
  }

  /**
   * Map Tripay status to BetterPay status
   */
  private mapStatus(
    status: 'UNPAID' | 'PAID' | 'EXPIRED' | 'FAILED' | 'REFUND'
  ): 'pending' | 'active' | 'completed' | 'expired' | 'canceled' | 'failed' {
    const statusMap: Record<string, 'pending' | 'active' | 'completed' | 'expired' | 'canceled' | 'failed'> = {
      UNPAID: 'pending',
      PAID: 'completed',
      EXPIRED: 'expired',
      FAILED: 'failed',
      REFUND: 'canceled',
    };

    return statusMap[status] || 'pending';
  }

  /**
   * Get supported payment methods
   */
  getSupportedPaymentMethods(): string[] {
    return [
      // Virtual Account
      'PERMATAVA',
      'BNIVA',
      'BRIVA',
      'MANDIRIVA',
      'BCAVA',
      'MUAMALATVA',
      'CIMBVA',
      'BSIVA',
      'OCBCVA',
      'DANAMONVA',
      'OTHERBANKVA',
      // Retail
      'ALFAMART',
      'INDOMARET',
      'ALFAMIDI',
      // E-Wallet
      'OVO',
      'DANA',
      'SHOPEEPAY',
      // QRIS
      'QRIS',
      'QRISC',
      'QRIS2',
      'QRIS_SHOPEEPAY',
    ];
  }
}
