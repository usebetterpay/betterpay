// ── @betterpay/client — Proxy-based Client SDK ───────────────────────────
//
// Usage:
// ```ts
// import { createPayClient } from "@betterpay/client";
//
// const pay = createPayClient({ baseURL: "/api/pay" });
//
// // Create a transaction
// const result = await pay.createTransaction({
//   orderId: "order_001",
//   amount: 100000,
//   customerEmail: "user@example.com",
// });
//
// // Check status
// const status = await pay.status({ orderId: "order_001" });
// ```

export interface PayClientOptions {
  /** Base URL for the BetterPay API. Default: "/pay" */
  baseURL?: string;

  /** Custom fetch function (for SSR, testing, etc.) */
  fetch?: typeof globalThis.fetch;

  /** Additional headers to include in every request. */
  headers?: Record<string, string>;
}

export interface PayClient {
  /** Create a one-time payment transaction. */
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

  /** Check the status of a transaction. */
  status(data: { orderId: string }): Promise<{
    orderId: string;
    status: string;
    amount: number;
    currency: string;
    providerId: string;
    providerTransactionId?: string | null;
  }>;

  /** Generic API call — for advanced use or plugin endpoints. */
  call<T = unknown>(path: string, data?: unknown): Promise<T>;
}

/**
 * Create a BetterPay client SDK.
 * Uses a proxy to dynamically route method calls to API endpoints.
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

  // Build the client with explicit methods + a generic `call` escape hatch.
  const client: PayClient = {
    async createTransaction(data) {
      return apiCall('POST', '/api/create-transaction', data);
    },

    async status(data) {
      return apiCall('GET', `/api/status/${data.orderId}`);
    },

    async call<T>(path: string, data?: unknown): Promise<T> {
      const method = data ? 'POST' : 'GET';
      return apiCall<T>(method, path, data);
    },
  };

  // Also wrap in a Proxy so that `pay.someMethod(data)` auto-maps to
  // POST /api/some-method (kebab-case) — PayKit-style dynamic dispatch.
  return new Proxy(client, {
    get(target, prop: string) {
      if (prop in target) {
        return (target as unknown as Record<string, unknown>)[prop];
      }
      // Dynamic dispatch: pay.someEndpoint(data) → POST /api/some-endpoint
      return (data?: unknown) => {
        const kebab = prop.replace(/([A-Z])/g, '-$1').toLowerCase();
        return apiCall('POST', `/api/${kebab}`, data);
      };
    },
  });
}
