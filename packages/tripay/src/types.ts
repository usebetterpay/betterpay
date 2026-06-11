/**
 * Tripay Configuration
 */
export interface TripayConfig {
  /**
   * API Key from Tripay dashboard
   */
  apiKey: string;

  /**
   * Private Key for signature generation
   */
  privateKey: string;

  /**
   * Merchant Code from Tripay dashboard
   */
  merchantCode: string;

  /**
   * Use sandbox environment
   * @default true
   */
  isSandbox?: boolean;
}

/**
 * Tripay Payment Channel
 */
export interface TripayPaymentChannel {
  group: string;
  code: string;
  name: string;
  type: 'direct' | 'redirect';
  fee_merchant: {
    flat: number;
    percent: number;
  };
  fee_customer: {
    flat: number;
    percent: number;
  };
  total_fee: {
    flat: number;
    percent: string;
  };
  minimum_fee: number;
  maximum_fee: number;
  minimum_amount: number;
  maximum_amount: number;
  icon_url: string;
  active: boolean;
}

/**
 * Tripay Transaction Request
 */
export interface TripayTransactionRequest {
  method: string;
  merchant_ref: string;
  amount: number;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  order_items: TripayOrderItem[];
  callback_url?: string;
  return_url?: string;
  expired_time?: number;
  signature: string;
}

/**
 * Tripay Order Item
 */
export interface TripayOrderItem {
  sku?: string;
  name: string;
  price: number;
  quantity: number;
  product_url?: string;
  image_url?: string;
}

/**
 * Tripay Transaction Response
 */
export interface TripayTransactionResponse {
  success: boolean;
  message?: string;
  data?: {
    reference: string;
    merchant_ref: string;
    payment_selection_type: string;
    payment_method: string;
    payment_name: string;
    customer_name: string;
    customer_email: string;
    customer_phone?: string;
    callback_url?: string;
    return_url?: string;
    amount: number;
    fee_merchant: number;
    fee_customer: number;
    total_fee: number;
    amount_received: number;
    pay_code: string;
    pay_url?: string;
    checkout_url: string;
    status: 'UNPAID' | 'PAID' | 'EXPIRED' | 'FAILED' | 'REFUND';
    expired_time: number;
    paid_at?: number;
    order_items: TripayOrderItem[];
    instructions?: TripayInstruction[];
    qr_string?: string;
    qr_url?: string;
  };
}

/**
 * Tripay Instruction
 */
export interface TripayInstruction {
  title: string;
  steps: string[];
}

/**
 * Tripay Callback Payload
 */
export interface TripayCallbackPayload {
  reference: string;
  merchant_ref: string;
  payment_method: string;
  payment_method_code: string;
  total_amount: number;
  fee_merchant: number;
  fee_customer: number;
  total_fee: number;
  amount_received: number;
  is_closed_payment: 0 | 1;
  status: 'PAID' | 'EXPIRED' | 'FAILED' | 'REFUND';
  paid_at?: number;
  note?: string;
}

/**
 * Tripay Callback Headers
 */
export interface TripayCallbackHeaders {
  'x-callback-signature': string;
  'x-callback-event': string;
}

/**
 * Tripay Transaction Status
 */
export type TripayTransactionStatus = 'UNPAID' | 'PAID' | 'EXPIRED' | 'FAILED' | 'REFUND';
