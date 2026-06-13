// ── Mayar Types ────────────────────────────────────────────────────────────

export interface MayarConfig {
  /** API Key from https://web.mayar.id/api-keys (or mayar.club for sandbox) */
  apiKey: string;
  /** Your merchant ID for webhook verification */
  merchantId: string;
  /** Use sandbox environment (api.mayar.club) */
  isSandbox?: boolean;
}

export interface MayarCreatePaymentRequest {
  name: string;
  email: string;
  amount: number;
  mobile?: string;
  redirectUrl?: string;
  description?: string;
  expiredAt?: string;
}

export interface MayarCreatePaymentResponse {
  statusCode: number;
  statusMessage: string;
  data: Array<{
    id: string;
    transactionId: string;
    paymentLink: string;
    amount: number;
    status: string;
  }>;
}

export interface MayarPaymentDetail {
  id: string;
  transactionId: string;
  amount: number;
  status: string;
  customerName: string;
  customerEmail: string;
  createdAt: string;
  updatedAt: string;
}

export interface MayarWebhookPayload {
  event: {
    received: string;
  };
  data: {
    id: string;
    status: boolean;
    createdAt: number;
    updatedAt: number;
    merchantId: string;
    merchantEmail: string;
    merchantName: string;
    customerName: string;
    customerEmail: string;
    customerMobile: string;
    amount: number;
    isAdminFeeBorneByCustomer: boolean;
    isChannelFeeBorneByCustomer: boolean;
    productId: string;
    productName: string;
    productType: string;
    pixelFbp: string;
    pixelFbc: string;
    addOn: unknown[];
    custom_field: unknown[];
  };
}

export type MayarWebhookEvent =
  | 'payment.received'
  | 'payment.reminder'
  | 'shipper.status'
  | 'membership.memberUnsubscribed'
  | 'membership.memberExpired'
  | 'membership.changeTierMemberRegistered'
  | 'membership.newMemberRegistered';
