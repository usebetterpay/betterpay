// ── @betterpay/next — Next.js App Router handler ─────────────────────────
//
// Usage:
// ```ts
// // app/api/pay/[...all]/route.ts
// import { payHandler } from "@betterpay/next";
// import { pay } from "@/billing";
//
// export const { GET, POST } = payHandler(pay);
// ```

import type { BetterPayInstance } from '@betterpay/core';

export interface PayHandlerResult {
  GET: (request: Request) => Promise<Response>;
  POST: (request: Request) => Promise<Response>;
}

/**
 * Create Next.js route handlers from a BetterPay instance.
 * Works with Next.js App Router (route.ts files).
 */
export function payHandler(pay: BetterPayInstance): PayHandlerResult {
  return {
    GET: async (request: Request) => pay.handler(request),
    POST: async (request: Request) => pay.handler(request),
  };
}
