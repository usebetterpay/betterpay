// ── SumoPod config + API shapes ──────────────────────────────────────────

export interface SumopodConfig {
  /** Project API key (dashboard → API Keys). */
  apiKey: string;
  /**
   * Svix-style signing secret (`whsec_…`) for webhook HMAC verification.
   * Prefer this in production. At least one of webhookSecret / webhookToken required for verify.
   */
  webhookSecret?: string;
  /**
   * Simple shared token (`whtok_…`) compared to `X-Webhook-Token`.
   * Weaker than HMAC; fine for sandbox / edge already TLS-terminated.
   */
  webhookToken?: string;
  /** Default true (sandbox API). Set false for production host. */
  isSandbox?: boolean;
  /**
   * Override API base (must be https).
   * Defaults: sandbox `https://api-pay-sandbox.sumopod.com/api/v1`
   *            live    `https://api-pay.sumopod.com/api/v1`
   */
  baseUrl?: string;
  /** Custom fetch (tests). */
  fetch?: typeof globalThis.fetch;
  /**
   * Max age of svix-timestamp in seconds (replay protection). Default 300.
   * Set 0 to disable timestamp skew check.
   */
  webhookToleranceSeconds?: number;
}

export interface SumopodCreatePaymentRequest {
  order_id: string;
  amount: number;
  currency: 'IDR';
  expires_in_hours?: number;
  success_return_url?: string;
  cancel_return_url?: string;
}

export interface SumopodCreatePaymentResponse {
  payment_id: string;
  order_id: string;
  amount: number;
  fee?: number;
  net_amount?: number;
  currency?: string;
  payment_link_url?: string | null;
  status: string;
  expires_at?: string | null;
  created_at?: string | null;
}

export interface SumopodWebhookPayload {
  event_type: string;
  data: {
    payment_id?: string;
    order_id?: string;
    amount?: number;
    fee?: number;
    net_amount?: number;
    status?: string;
    payment_method?: string;
    completed_at?: string;
    [key: string]: unknown;
  };
}
