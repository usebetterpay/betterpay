// ── @betterpay/bun — Bun handler ─────────────────────────────────────────
//
// Usage:
//   import { payHandler } from "@betterpay/bun";
//   import { pay } from "./billing";
//
//   Bun.serve({
//     port: 3000,
//     fetch: payHandler(pay),
//   });

import type { BetterPayInstance } from '@betterpay/core';

type BunFetchHandler = (request: Request) => Promise<Response>;

/**
 * Create a Bun-compatible fetch handler from a BetterPay instance.
 * Bun uses standard Web Request/Response, so this is a thin wrapper.
 */
export function payHandler(pay: BetterPayInstance): BunFetchHandler {
  return async (request: Request): Promise<Response> => {
    return pay.handler(request);
  };
}
