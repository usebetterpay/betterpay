// ── @betterpay/hono — Hono handler ──────────────────────────────────────
//
// Usage:
// ```ts
// import { Hono } from "hono";
// import { payHandler } from "@betterpay/hono";
// import { pay } from "./billing";
//
// const app = new Hono();
// app.all("/pay/*", payHandler(pay));
// ```

import type { BetterPayInstance } from '@betterpay/core';

/**
 * Hono context interface (minimal, avoids hard dependency on hono package).
 */
interface HonoContext {
  req: { raw: Request };
  res: Response;
  header: (name: string, value: string) => void;
  status: (code: number) => void;
  json: (data: unknown) => Response;
}

type HonoHandler = (c: HonoContext) => Promise<Response>;

/**
 * Create a Hono-compatible handler from a BetterPay instance.
 * Mount on your Hono app with `app.all("/pay/*", payHandler(pay))`.
 */
export function payHandler(pay: BetterPayInstance): HonoHandler {
  return async (c: HonoContext) => {
    return pay.handler(c.req.raw);
  };
}
