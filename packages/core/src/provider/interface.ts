// ── Payment methods supported by Indonesian providers ──────────────────────
export type PaymentMethod =
  | 'virtual_account'
  | 'ewallet'
  | 'qris'
  | 'credit_card'
  | 'retail'
  | 'paylater'
  | 'bank_transfer';

// ── Provider capability flags ──────────────────────────────────────────────
export interface ProviderCapabilities {
  paymentLink: boolean;
  recurring: boolean;
  refund: boolean;
  virtualAccount?: boolean;
  ewallet?: boolean;
  qris?: boolean;
  creditCard?: boolean;
  retail?: boolean;
  paylater?: boolean;
  payout?: boolean;
  customerPortal?: boolean;
}

// ── Input for creating a payment link ──────────────────────────────────────
export interface CreatePaymentLinkInput {
  orderId: string;
  amount: number;
  currency: string;
  customerEmail: string;
  customerName?: string;
  customerPhone?: string;
  description: string;
  callbackUrl: string;
  returnUrl: string;
  paymentMethod?: string;
  items?: Array<{
    name: string;
    price: number;
    quantity: number;
  }>;
  metadata?: Record<string, string>;
  expiryMinutes?: number;
}

// ── Result of creating a payment link ──────────────────────────────────────
export interface PaymentLinkResult {
  providerTransactionId: string;
  paymentUrl?: string;
  qrString?: string;
  vaNumber?: string;
  vaBank?: string;
  amount: number;
  currency: string;
  expiresAt?: string;
  status: 'pending' | 'active' | 'completed' | 'expired' | 'canceled' | 'failed';
  raw: unknown;
}

// ── Status check result ────────────────────────────────────────────────────
export interface StatusResult {
  providerTransactionId: string;
  status: 'pending' | 'active' | 'completed' | 'expired' | 'canceled' | 'failed';
  amount: number;
  currency: string;
  paidAt?: string;
  paymentMethod?: string;
  raw: unknown;
}

// ── Webhook data ───────────────────────────────────────────────────────────
export interface WebhookData {
  body: string;
  headers: Record<string, string>;
}

export interface NormalizedWebhookEvent {
  name: string;
  payload: Record<string, unknown>;
  providerEventId?: string;
}

// ── Provider interface (function-based, not class-based) ───────────────────
export interface PaymentProvider {
  readonly id: string;
  readonly name: string;
  readonly paymentMethods: PaymentMethod[];
  readonly capabilities: ProviderCapabilities;

  createPaymentLink(data: CreatePaymentLinkInput): Promise<PaymentLinkResult>;
  verifyWebhook(data: WebhookData): Promise<boolean>;
  normalizeWebhook(data: WebhookData): Promise<NormalizedWebhookEvent[]>;
  getApiEndpoint(): string;

  checkStatus?(providerTransactionId: string): Promise<StatusResult>;
  cancelTransaction?(providerTransactionId: string): Promise<void>;
  refund?(data: {
    providerTransactionId: string;
    amount: number;
    reason?: string;
  }): Promise<{ status: 'refunded' | 'pending' | 'failed'; providerRefundId?: string }>;
}
