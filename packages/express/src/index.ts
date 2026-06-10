// ── @betterpay/express — Express handler ─────────────────────────────────
//
// Usage:
// ```ts
// import express from "express";
// import { payHandler } from "@betterpay/express";
// import { pay } from "./billing";
//
// const app = express();
// app.all("/pay/*", payHandler(pay));
// app.listen(3000);
// ```

import type { BetterPayInstance } from '@betterpay/core';

/**
 * Minimal Express-compatible types (avoids hard dependency on express).
 */
interface ExpressRequest {
  method: string;
  url: string;
  headers: Record<string, string | string[] | undefined>;
  on(event: string, listener: (...args: any[]) => void): void;
}

interface ExpressResponse {
  writeHead(status: number, headers?: Record<string, string>): void;
  end(body?: string): void;
}

type NextFunction = (err?: unknown) => void;
type ExpressHandler = (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => Promise<void>;

/**
 * Create an Express middleware from a BetterPay instance.
 */
export function payHandler(pay: BetterPayInstance): ExpressHandler {
  return async (req, res, _next) => {
    // Convert Express req → Web Request
    const host = (req.headers.host as string) ?? 'localhost';
    const url = `http://${host}${req.url}`;
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (value) {
        headers.set(key, Array.isArray(value) ? value[0]! : value);
      }
    }

    let body: string | undefined;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      body = await readBody(req);
    }

    const request = new Request(url, {
      method: req.method,
      headers,
      body: body ?? undefined,
    });

    const response = await pay.handler(request);

    // Convert Web Response → Express res
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    res.writeHead(response.status, responseHeaders);
    res.end(await response.text());
  };
}

function readBody(req: ExpressRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}
