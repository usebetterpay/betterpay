// ── @betterpay/cloudflare — Cloudflare Workers handler ──────────────────
//
// Usage:
// ```ts
// import { payHandler } from "@betterpay/cloudflare";
// import { pay } from "./billing";
//
// export default {
//   fetch: payHandler(pay),
//   // Optional: cron trigger for billing cycle
//   async scheduled(event, env) {
//     await pay.runBillingCycle();
//   },
// };
// ```

import type { BetterPayInstance } from '@betterpay/core';

type WorkerFetchHandler = (request: Request, env?: unknown, ctx?: unknown) => Promise<Response>;

/**
 * Create a Cloudflare Workers-compatible fetch handler from a BetterPay instance.
 * Workers use standard Web Request/Response, so this is a thin wrapper.
 */
export function payHandler(pay: BetterPayInstance): WorkerFetchHandler {
  return async (request: Request): Promise<Response> => {
    return pay.handler(request);
  };
}
