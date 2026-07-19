// ── @betterpay/client — Typed Client SDK ─────────────────────────────────
//
// Only methods that map to real core router endpoints are typed.
// Use `call()` for experimental/plugin routes — no infinite proxy.

export interface PayClientOptions {
  /** Base URL for the BetterPay API. Default: "/pay" */
  baseURL?: string;

  /** Custom fetch function (for SSR, testing, etc.) */
  fetch?: typeof globalThis.fetch;

  /** Additional headers to include in every request. */
  headers?: Record<string, string>;
}

export interface PayClient {
  createTransaction(data: {
    orderId: string;
    amount: number;
    currency?: string;
    customerEmail: string;
    customerName?: string;
    description?: string;
    callbackUrl?: string;
    returnUrl?: string;
    paymentMethod?: string;
    providerId?: string;
    metadata?: Record<string, string>;
  }): Promise<{
    orderId: string;
    paymentUrl?: string;
    providerTransactionId: string;
    status: string;
    amount: number;
    currency: string;
  }>;

  status(data: { orderId: string }): Promise<{
    orderId: string;
    status: string;
    amount: number;
    currency: string;
    providerId: string;
    providerTransactionId?: string | null;
  }>;

  /** POST /api/reconcile — usually server-side / cron only. */
  reconcile(): Promise<{
    success: boolean;
    totalChecked: number;
    updated: number;
    conflicts: number;
    errors: number;
  }>;

  subscribe(data: {
    customerId: string;
    planId: string;
  }): Promise<{
    subscriptionId: string;
    status: string;
    paymentUrl?: string;
  }>;

  check(data: {
    customerId: string;
    featureId: string;
  }): Promise<{ allowed: boolean; balance: unknown }>;

  report(data: {
    customerId: string;
    featureId: string;
    amount: number;
  }): Promise<{ success: boolean; balance: unknown }>;

  createCustomer(data: {
    email: string;
    name?: string;
    phone?: string;
  }): Promise<{ id: string; email: string }>;

  getInvoices(data: { subscriptionId: string }): Promise<{ invoices: unknown[] }>;

  /** Escape hatch for plugin or custom paths (relative to baseURL). */
  call<T = unknown>(path: string, data?: unknown): Promise<T>;
}

/**
 * Create a BetterPay client for the HTTP API exposed by @betterpay/core.
 */
export function createPayClient(options: PayClientOptions = {}): PayClient {
  const baseURL = (options.baseURL ?? '/pay').replace(/\/$/, '');
  const fetchFn = options.fetch ?? globalThis.fetch;
  const baseHeaders = options.headers ?? {};

  async function apiCall<T>(method: string, path: string, data?: unknown): Promise<T> {
    const url = `${baseURL}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...baseHeaders,
    };

    const init: RequestInit = {
      method,
      headers,
    };

    if (data !== undefined && method !== 'GET') {
      init.body = JSON.stringify(data);
    }

    const response = await fetchFn(url, init);

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'unknown');
      throw new Error(`BetterPay API error ${response.status}: ${errorBody}`);
    }

    return response.json() as Promise<T>;
  }

  return {
    async createTransaction(data) {
      return apiCall('POST', '/api/create-transaction', data);
    },

    async status(data) {
      return apiCall('GET', `/api/status/${data.orderId}`);
    },

    async reconcile() {
      return apiCall('POST', '/api/reconcile');
    },

    async subscribe(data) {
      return apiCall('POST', '/api/subscribe', data);
    },

    async check(data) {
      return apiCall('POST', '/api/check', data);
    },

    async report(data) {
      return apiCall('POST', '/api/report', data);
    },

    async createCustomer(data) {
      return apiCall('POST', '/api/customer', data);
    },

    async getInvoices(data) {
      return apiCall('GET', `/api/invoices/${data.subscriptionId}`);
    },

    async call<T>(path: string, data?: unknown): Promise<T> {
      const method = data !== undefined ? 'POST' : 'GET';
      return apiCall<T>(method, path, data);
    },
  };
}
