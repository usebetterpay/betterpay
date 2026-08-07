# BetterPay

One API for every Indonesian payment gateway.

**Status: Alpha** — suitable for evaluation and careful production use only when you follow the [Production checklist](#production-checklist). Defaults are in-memory (dev/test). Durable Postgres stores must be injected for real deployments.

[![npm version](https://img.shields.io/npm/v/@betterpay/core?style=flat&colorA=000&colorB=000)](https://www.npmjs.com/package/@betterpay/core)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat&colorA=000&colorB=000)](./LICENSE)

[Documentation](https://github.com/usebetterpay/betterpay/tree/main/docs)
·
[Issues](https://github.com/usebetterpay/betterpay/issues)

## Why BetterPay

Indonesia has 22+ payment gateways — Midtrans, Xendit, Duitku, Pakasir, Tripay, Mayar, SumoPod, DOKU, Winpay, Espay, Nicepay, Faspay, OY!, SingaPay, Durianpay, Paylabs, Prismalink, Cashlez, Flip, iPaymu, IPay88, Finpay — each with different APIs, signature schemes, webhook formats, and status codes. Integrating one takes days. Integrating all of them takes weeks.

BetterPay unifies them under a single API. You write payment create/status/webhook logic once, plug in providers, and get signature verification, status normalization, and optional durable webhook idempotency. Provider-specific quirks still exist (especially weak webhook auth on Mayar/Pakasir) — this is an abstraction layer, not a substitute for reading gateway docs when debugging.

## Publishing packages

Releases are automated with Changesets and GitHub Actions. When changing a publishable package, add a changeset:

```bash
pnpm changeset
```

Select the affected package and release type, then commit the generated `.changeset/*.md` file. After the change reaches `main`, the release workflow opens a release PR. Merging that PR versions the packages, updates changelogs, builds, and publishes changed public packages to npm.

Repository administrators must configure an `NPM_TOKEN` GitHub Actions secret with publish access to the `@betterpay` scope. Never commit npm tokens or place them in source files.

## Install

```bash
pnpm add @betterpay/core @betterpay/midtrans
```

Or pick your provider:

```bash
pnpm add @betterpay/core @betterpay/xendit      # Xendit
pnpm add @betterpay/core @betterpay/duitku      # Duitku
pnpm add @betterpay/core @betterpay/pakasir     # Pakasir
pnpm add @betterpay/core @betterpay/tripay      # Tripay
pnpm add @betterpay/core @betterpay/mayar       # Mayar
pnpm add @betterpay/core @betterpay/sumopod     # SumoPod (QRIS-only)
pnpm add @betterpay/core @betterpay/doku        # DOKU (SNAP BCA VA)
pnpm add @betterpay/core @betterpay/winpay      # Winpay (SNAP VA/QRIS/eWallet)
pnpm add @betterpay/core @betterpay/espay       # Espay (SNAP Host-to-Host + VA)
pnpm add @betterpay/core @betterpay/nicepay     # Nicepay (SNAP VA/QRIS)
pnpm add @betterpay/core @betterpay/faspay      # Faspay (Payment + Billing)
pnpm add @betterpay/core @betterpay/oy          # OY! Indonesia (Disbursement/Payout)
pnpm add @betterpay/core @betterpay/singapay    # SingaPay (HMAC SHA512, B2B)
pnpm add @betterpay/core @betterpay/durianpay   # Durianpay (B2B stack, VA/QRIS/Payout)
pnpm add @betterpay/core @betterpay/paylabs     # Paylabs (Berlisensi BI)
pnpm add @betterpay/core @betterpay/prismalink  # Prismalink (Payment Link)
pnpm add @betterpay/core @betterpay/cashlez     # Cashlez (RSA Tbk)
pnpm add @betterpay/core @betterpay/flip        # Flip (Disbursement/Payout #2)
pnpm add @betterpay/core @betterpay/ipaymu      # iPaymu (SME, 30 channels)
pnpm add @betterpay/core @betterpay/ipay88      # IPay88 (MY gateway)
pnpm add @betterpay/core @betterpay/finpay      # Finpay (Telkom Indonesia)
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

| Provider | VA | E-Wallet | QRIS | Credit Card | Retail | Payout |
|----------|:--:|:--------:|:----:|:-----------:|:------:|:------:|
| **Midtrans** | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| **Xendit** | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| **Duitku** | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| **Pakasir** | — | ✅ | ✅ | — | — | — |
| **Tripay** | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| **Mayar** | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| **SumoPod** | — | — | ✅ | — | — | — |
| **DOKU** | ✅ | — | — | — | — | — |
| **Winpay** | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| **Espay** | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| **Nicepay** | ✅ | — | ✅ | ✅ | ✅ | — |
| **Faspay** | ✅ | — | ✅ | ✅ | ✅ | — |
| **OY! Indonesia** | — | — | — | — | — | ✅ |
| **SingaPay** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Durianpay** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Paylabs** | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| **Prismalink** | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| **Cashlez** | ✅ | — | ✅ | ✅ | — | — |
| **Flip** | — | — | — | — | — | ✅ |
| **iPaymu** | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| **IPay88** | ✅ | ✅ | ✅ | ✅ | — | — |
| **Finpay** | ✅ | ✅ | ✅ | ✅ | ✅ | — |

Multiple providers can be registered; the highest-priority provider is selected by default. `createTransaction` uses **retry + per-provider circuit breaker**. **Failover** (try next provider after retryable failures) is **opt-in** via `betterPay({ failover: true })` and only applies to create-link failures before the customer pays — never mid-payment.

## Frameworks

| Framework | Package |
|-----------|---------|
| Next.js (App Router) | `@betterpay/next` |
| Hono | `@betterpay/hono` |
| Express | `@betterpay/express` |
| Bun | `@betterpay/bun` |
| Cloudflare Workers | `@betterpay/cloudflare` |

All handlers wrap the same core `Request → Response` handler. Zero framework lock-in.

## Production checklist

Before production traffic:

1. **Durable transaction store** — pass `transactionRepository` from `@betterpay/drizzle-adapter` (or your own). Do not rely on the default in-memory map.
2. **Durable webhook idempotency** — pass `webhookEventRepository` (drizzle `repos.webhookEvent`). Process-local stores lose dedup on restart and can double-apply status updates.
3. **Durable billing repos** — if you use `@betterpay/billing`, pass `repositories: { subscription, entitlement, customer, invoice }` from drizzle. Omitting them uses in-memory only (a warning is logged when `NODE_ENV=production`).
4. **Prefer crypto webhook providers** — Midtrans, Xendit, Duitku, Tripay, and SumoPod (Svix HMAC or token) verify with signatures. **Mayar and Pakasir use field-match only** (`weakWebhookAuth`); add IP allowlisting or edge secrets if you must use them.
5. **Credential store** — optional AES-256-GCM store needs `BETTERPAY_MASTER_KEY` (min 32 chars) plus a credential repository.
6. **Replay timestamps** — BetterPay validates `x-webhook-timestamp` only when the provider sends it; this is not global replay protection for every gateway.
7. **Reconciliation cron** — call `pay.runReconciliation()` or `POST /api/reconcile` on a schedule (e.g. hourly). Do not rely on in-process `setInterval` on serverless. Optional: `reconciliation: { enabled: true, startInterval: true }` for long-lived Node only.
8. **Billing cycle cron** — if you use subscriptions, schedule `pay.billing.runBillingCycle()` (ID market: no auto-debit; generates invoices + payment links).

### Production bootstrap example

```typescript
import { betterPay } from "@betterpay/core";
import { midtrans } from "@betterpay/midtrans";
import { billing, feature, plan } from "@betterpay/billing";
import { createDrizzleRepositories } from "@betterpay/drizzle-adapter";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);
const repos = createDrizzleRepositories(db);

const messages = feature({ id: "messages", type: "metered" });
const pro = plan({
  id: "pro",
  group: "base",
  name: "Pro",
  price: { amount: 199_000, currency: "IDR", interval: "month" },
  includes: [messages({ limit: 5_000, reset: "month" })],
});

const pay = betterPay({
  transactionRepository: repos.transaction,
  webhookEventRepository: repos.webhookEvent,
  plugins: [
    midtrans({ serverKey: process.env.MIDTRANS_SERVER_KEY! }),
    billing({
      products: [pro],
      repositories: {
        subscription: repos.subscription,
        entitlement: repos.entitlement,
        customer: repos.customer,
        invoice: repos.invoice,
      },
    }),
  ],
});
```

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
| `@betterpay/sumopod` | SumoPod adapter (sandbox + Svix/token webhooks) |
| `@betterpay/doku` | DOKU SNAP B2B BCA Virtual Account adapter (`/virtual-accounts/bi-snap-va/v1/transfer-va/create-va`) |
| `@betterpay/winpay` | Winpay adapter (SNAP VA/QRIS/eWallet/Retail/CC, RSA-SHA256, `sandbox-snap.winpay.id`) |
| `@betterpay/espay` | Espay adapter (SNAP Host-to-Host redirect + VA/QRIS, RSA-SHA256 + HMAC, `sandbox-api.espay.id`) |
| `@betterpay/nicepay` | Nicepay adapter (SNAP VA/QRIS, RSA-SHA256, `dev.nicepay.co.id`) |
| `@betterpay/faspay` | Faspay adapter (Payment + Billing, HMAC-SHA256 + optional SNAP RSA, `fpg-sandbox.faspay.co.id`) |
| `@betterpay/oy` | OY! Indonesia adapter (Disbursement/Payout via `X-OY-Username`/`X-Api-Key` + IP allowlist, `partner.oyindonesia.com`) |
| `@betterpay/singapay` | SingaPay adapter (HMAC SHA512 B2B, VA/QRIS/Disbursement, `api-lb.singapay.id`) |
| `@betterpay/durianpay` | Durianpay adapter (B2B stack, VA/QRIS/Payouts, 130+ banks + e-wallets, `api.durianpay.id`) |
| `@betterpay/paylabs` | Paylabs adapter (BI licensed, VA/QRIS/eWallet, `api.paylabs.co.id`) |
| `@betterpay/prismalink` | Prismalink adapter (Payment gateway + link, `api.prismalink.co.id`) |
| `@betterpay/cashlez` | Cashlez adapter (RSA Tbk, Link + Card, `api-link.cashlez.com`) |
| `@betterpay/flip` | Flip adapter (Disbursement/Payout #2, bank transfer, `api.flip.id`) |
| `@betterpay/ipaymu` | iPaymu adapter (SME Plug&Play, 30 channels, `my.ipaymu.com`) |
| `@betterpay/ipay88` | IPay88 adapter (MY/ID gateway, card + VA, `payment.ipay88.co.id`) |
| `@betterpay/finpay` | Finpay adapter (Telkom Indonesia, `api.finpay.id`) |
| `@betterpay/client` | Proxy-based client SDK |
| `@betterpay/ui` | React billing UI (pricing, portal, invoices, usage) |
| `@betterpay/cli` | CLI tools (init, push, status, credentials) |
| `@betterpay/drizzle-adapter` | PostgreSQL repositories (Drizzle ORM) |
| `@betterpay/next` | Next.js handler |
| `@betterpay/hono` | Hono handler |
| `@betterpay/express` | Express handler |
| `@betterpay/bun` | Bun handler |
| `@betterpay/cloudflare` | Cloudflare Workers handler |
| `@betterpay/notification-email` | Resend email notifications (`invoice.created`, `payment.failed`, …) |
| `@betterpay/notification-whatsapp` | Fonnte WhatsApp (`apiKey` / `FONNTE_TOKEN`) |

## Features

- **Plugin-first** — providers, billing, Resend email; merge `endpoints` + `onRequest`/`onResponse`
- **Notifications** — `NotificationChannel`; Resend email + Fonnte WhatsApp plugins
- **Priority provider selection** — default by priority; opt-in failover on create-link only
- **Retry + circuit breaker** — wired into `createTransaction` / HTTP create path
- **Reconciliation** — `runReconciliation` / `POST /api/reconcile` polls `checkStatus` for pending/active txns
- **Webhook pipeline** — signature verify, optional timestamp check, injectable durable idempotency store
- **Subscription engine** — 5-state machine, entitlement tracking, multi-stage dunning, billing cycle runner
- **CLI push** — `betterpay push` applies SQL migrations from `@betterpay/drizzle-adapter` (`DATABASE_URL`)
- **Encrypted credentials** — optional AES-256-GCM storage for provider API keys
- **Test clock** — simulate billing cycles without waiting months
- **Currency utilities** — ISO 4217 minor units, IDR/USD/VND conversion
- **Security middleware helpers** — hooks for auth/CSRF/roles; your app implements policies

## Architecture

```
Your App (Next.js / Hono / Express / Bun / Cloudflare)
        │
   betterPay({ plugins: [...] })
        │
   ┌────┼──────┬──────┬──────┬──────┬──────┬────────┬───────┬─────────┬────────┬───────┬────┐
   │    │      │      │      │      │      │        │       │         │        │       │    │
  Core  Midtrans Xendit Duitku Pakasir Tripay Mayar SumoPod DOKU Winpay Espay Nicepay Faspay  OY!  ← 13 providers
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
