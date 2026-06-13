# BetterPay

One API for every Indonesian payment gateway.

[![npm version](https://img.shields.io/npm/v/@betterpay/core?style=flat&colorA=000&colorB=000)](https://www.npmjs.com/package/@betterpay/core)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat&colorA=000&colorB=000)](./LICENSE)

[Documentation](https://github.com/usebetterpay/betterpay/tree/main/docs)
·
[Issues](https://github.com/usebetterpay/betterpay/issues)

## Why BetterPay

Indonesia has 6+ payment gateways — Midtrans, Xendit, Duitku, Pakasir, Tripay, Mayar — each with different APIs, signature schemes, webhook formats, and status codes. Integrating one takes days. Integrating all of them takes weeks.

BetterPay unifies them under a single API. You write your payment logic once, plug in whichever provider you need, and BetterPay handles signature verification, webhook idempotency, circuit breakers, reconciliation, and status normalization — so you never have to read another payment gateway docs.

## Install

```bash
pnpm add @betterpay/core @betterpay/midtrans
```

Or pick your provider:

```bash
pnpm add @betterpay/core @betterpay/xendit    # Xendit
pnpm add @betterpay/core @betterpay/duitku    # Duitku
pnpm add @betterpay/core @betterpay/pakasir   # Pakasir
pnpm add @betterpay/core @betterpay/tripay    # Tripay
pnpm add @betterpay/core @betterpay/mayar     # Mayar
```

## Quick Start

```typescript
import { betterPay } from "@betterpay/core";
import { midtrans } from "@betterpay/midtrans";

const pay = betterPay({
  plugins: [
    midtrans({
      serverKey: process.env.MIDTRANS_SERVER_KEY!,
      isSandbox: process.env.NODE_ENV !== "production",
    }),
  ],
});

// Create a payment
const result = await pay.createTransaction({
  orderId: "order_123",
  amount: 150_000,
  currency: "IDR",
  customerEmail: "user@example.com",
});
// → { paymentUrl, providerTransactionId, status: "active" }

// Handle webhook
const webhook = await pay.handleWebhook("midtrans", { body, headers });
// → { success: true, eventName: "payment.completed" }
```

Mount it on any framework:

```typescript
// Next.js App Router
import { payHandler } from "@betterpay/next";
export const { GET, POST } = payHandler(pay);

// Hono
app.all("/api/pay/*", (c) => pay.handler(c.req.raw));

// Express
app.use("/api/pay", (req, res) => pay.handler(req));
```

## Subscription Billing

Add the billing plugin for plans, subscriptions, entitlements, and invoicing:

```bash
pnpm add @betterpay/billing
```

```typescript
import { betterPay } from "@betterpay/core";
import { midtrans } from "@betterpay/midtrans";
import { billing, feature, plan } from "@betterpay/billing";

const messages = feature({ id: "messages", type: "metered" });

const free = plan({
  id: "free", group: "base", default: true, name: "Free",
  includes: [messages({ limit: 100, reset: "month" })],
});

const pro = plan({
  id: "pro", group: "base", name: "Pro",
  price: { amount: 199_000, currency: "IDR", interval: "month" },
  includes: [messages({ limit: 5_000, reset: "month" })],
});

const pay = betterPay({
  plugins: [
    midtrans({ serverKey: process.env.MIDTRANS_SERVER_KEY! }),
    billing({ products: [free, pro] }),
  ],
});

// Subscribe
await pay.billing.subscribe({ customerId: "user_1", planId: "pro" });

// Check entitlement
await pay.billing.check({ customerId: "user_1", featureId: "messages" });
// → { allowed: true, balance: { limit: 5000, remaining: 4999 } }

// Report usage
await pay.billing.report({ customerId: "user_1", featureId: "messages", amount: 1 });
```

## Providers

| Provider | VA | E-Wallet | QRIS | Credit Card | Retail |
|----------|:--:|:--------:|:----:|:-----------:|:------:|
| **Midtrans** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Xendit** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Duitku** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Pakasir** | — | ✅ | ✅ | — | — |
| **Tripay** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Mayar** | ✅ | ✅ | ✅ | ✅ | ✅ |

Multiple providers can run simultaneously with automatic failover and circuit breaker.

## Frameworks

| Framework | Package |
|-----------|---------|
| Next.js (App Router) | `@betterpay/next` |
| Hono | `@betterpay/hono` |
| Express | `@betterpay/express` |
| Bun | `@betterpay/bun` |
| Cloudflare Workers | `@betterpay/cloudflare` |

All handlers wrap the same core `Request → Response` handler. Zero framework lock-in.

## Credential Management

Store provider API keys encrypted in PostgreSQL (AES-256-GCM):

```bash
# Set credentials
betterpay credentials set midtrans --server-key=SB-Mid-xxx

# List (masked)
betterpay credentials list

# Get (decrypted)
betterpay credentials get midtrans
```

```typescript
// Runtime access
const creds = await pay.credentialStore.get("midtrans");
// → { serverKey: "SB-Mid-xxx" }
```

Requires `DATABASE_URL` and `BETTERPAY_MASTER_KEY` (min 32 chars) environment variables.

## Packages

| Package | Description |
|---------|-------------|
| `@betterpay/core` | Factory, router, providers, webhooks, security |
| `@betterpay/billing` | Plans, subscriptions, entitlements, invoices, billing cycles |
| `@betterpay/midtrans` | Midtrans adapter |
| `@betterpay/xendit` | Xendit adapter |
| `@betterpay/duitku` | Duitku adapter |
| `@betterpay/pakasir` | Pakasir adapter |
| `@betterpay/tripay` | Tripay adapter |
| `@betterpay/mayar` | Mayar adapter |
| `@betterpay/client` | Proxy-based client SDK |
| `@betterpay/cli` | CLI tools (init, push, status, credentials) |
| `@betterpay/drizzle-adapter` | PostgreSQL repositories (Drizzle ORM) |
| `@betterpay/next` | Next.js handler |
| `@betterpay/hono` | Hono handler |
| `@betterpay/express` | Express handler |
| `@betterpay/bun` | Bun handler |
| `@betterpay/cloudflare` | Cloudflare Workers handler |
| `@betterpay/notification-email` | Email notification plugin |
| `@betterpay/notification-whatsapp` | WhatsApp notification plugin |

## Features

- **Plugin-first** — providers, billing, and notifications are all plugins
- **Auto-fallback** — priority-based provider selection with circuit breaker per provider
- **Webhook pipeline** — idempotent processing, replay protection, reconciliation worker
- **Subscription engine** — 5-state machine, entitlement tracking with lazy reset, billing cycles, dunning
- **Encrypted credentials** — AES-256-GCM storage for provider API keys
- **Test clock** — simulate billing cycles without waiting months
- **Currency utilities** — ISO 4217 minor units, IDR/USD/VND conversion
- **Security middleware** — auth, CSRF, rate limiting, role-based access, audit logging hooks

## Architecture

```
Your App (Next.js / Hono / Express / Bun / Cloudflare)
        │
   betterPay({ plugins: [...] })
        │
   ┌────┼──────┬──────┬──────┬──────┬──────┐
   │    │      │      │      │      │      │
  Core  Midtrans Xendit Duitku Pakasir Tripay Mayar   ← Provider plugins
   │
   ├── billing          ← Subscription + entitlement plugin
   ├── notification-*   ← Email / WhatsApp plugins
   ├── drizzle-adapter  ← PostgreSQL persistence
   └── client           ← Frontend SDK
```

## Contributing

BetterPay is free and open source under the [MIT License](./LICENSE). Contributions welcome.

- [Report issues](https://github.com/usebetterpay/betterpay/issues)
- Open pull requests

## Security

If you discover a security vulnerability, please email [ujangas1908@gmail.com](mailto:ujangas1908@gmail.com). All reports will be promptly addressed.

## License

[MIT](./LICENSE) © BetterPay Contributors
