# BetterPay

> **Indonesian billing framework** — One API for Midtrans, Xendit, DOKU, Duitku, Pakasir.
> Plugin-first architecture. Framework-agnostic. Built on production-proven payment infrastructure.

```typescript
import { betterPay } from "@betterpay/core";
import { midtrans } from "@betterpay/midtrans";
import { xendit } from "@betterpay/xendit";
import { billing } from "@betterpay/billing";
import { feature, plan } from "@betterpay/billing";

// Define your plans
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

// Initialize
export const pay = betterPay({
  database: process.env.DATABASE_URL!,
  products: [free, pro],
  plugins: [
    midtrans({ serverKey: process.env.MIDTRANS_SERVER_KEY! }),
    xendit({ apiKey: process.env.XENDIT_API_KEY! }),
    billing({ products: [free, pro] }),
  ],
});

// Accept payment
const result = await pay.subscribe({ planId: "pro", customerId: "user_123" });
// → { paymentUrl: "https://app.midtrans.com/snap/...", vaNumber: "1234...", qrString: "000201..." }

// Check entitlement
const check = await pay.check({ customerId: "user_123", featureId: "messages" });
// → { allowed: true, balance: { limit: 5000, remaining: 4999, resetAt: Date } }
```

## Install

```bash
# Core + one provider (minimum)
npm install @betterpay/core @betterpay/midtrans

# Add billing (subscriptions, entitlements, plans)
npm install @betterpay/billing

# Add more providers
npm install @betterpay/xendit @betterpay/duitku

# Add notifications
npm install @betterpay/notification-email @betterpay/notification-whatsapp
```

## Quick Start

```bash
# Initialize in your project
npx @betterpay/cli init

# Apply migrations + sync products
npx @betterpay/cli push

# Check status
npx @betterpay/cli status
```

## Documentation

| Document | Description |
|----------|-------------|
| **[ARCHITECTURE.md](ARCHITECTURE.md)** | Complete architecture — three pillars, all layers |
| **[docs/DESIGN_DECISIONS.md](docs/DESIGN_DECISIONS.md)** | 15 architectural decisions with evidence |
| **[docs/SUMMARY.md](docs/SUMMARY.md)** | Executive summary of research & architecture |
| **[docs/paykit-feature-mapping.md](docs/paykit-feature-mapping.md)** | 182 PayKit features mapped to BetterPay |
| **[docs/provider-research-2026.md](docs/provider-research-2026.md)** | Provider pricing, APIs, regulations |
| **[COMPARISON.md](COMPARISON.md)** | Better Auth vs BetterPay comparison |

## Supported Providers

| Provider | Payment Methods | Subscription API | Settlement |
|----------|----------------|:---:|:---:|
| **Midtrans** | VA, e-wallet, QRIS, CC, retail, paylater | ✅ | T+1 to T+3 |
| **Xendit** | VA, e-wallet, QRIS, CC, retail, direct debit | ✅ (full) | T+1 to T+2 |
| **DOKU** | VA, e-wallet, QRIS, CC, retail, paylater | ✅ | T+1 to T+5 |
| **Duitku** | VA (most banks), e-wallet, QRIS, CC, retail | ❌ | T+1 to T+2 |
| **Pakasir** | QRIS, e-wallet | ❌ | Instant |

## Supported Frameworks

| Framework | Handler | Status |
|-----------|---------|--------|
| Next.js (App Router) | `@betterpay/next` | Phase 1 |
| Hono | `@betterpay/hono` | Phase 1 |
| Express | `@betterpay/express` | Phase 3 |
| Fastify | `@betterpay/fastify` | Phase 3 |
| Bun | `@betterpay/bun` | Phase 3 |
| Cloudflare Workers | `@betterpay/cloudflare` | Phase 3 |

## Key Features

- **🔌 Plugin-first** — Everything is a plugin: providers, notifications, billing, compliance
- **🇮🇩 Indonesian payment methods** — VA, QRIS, e-wallet, CC, retail, paylater
- **📋 Subscription management** — Plans, entitlements, billing cycles, dunning
- **🔄 Auto-fallback** — Priority-based provider selection with circuit breaker
- **🪝 Webhook pipeline** — Idempotent processing, replay protection, reconciliation
- **🏗️ Framework-agnostic** — Works with Next.js, Hono, Express, Fastify, Bun, Cloudflare
- **📱 Client SDK** — Proxy-based with type inference from server config
- **🧪 Test clock** — Simulate billing cycles without waiting months

## Architecture

BetterPay is built on three pillars:

1. **Architecture** (from Better Auth) — Plugin system, better-call router, hooks, adapter factory
2. **Domain model** (from PayKit) — Plans, features, entitlements, subscriptions, webhooks
3. **Payment infra** (from wabase) — Provider adapters, circuit breaker, reconciliation, state machine

```
Your App (Any Framework)
        │
  @betterpay/core          ← Pure Node.js, zero framework deps
        │
  ┌─────┼─────────┐
  │     │         │
Midtrans Xendit  Duitku    ← Provider plugins (extracted from wabase)
```

## Status

🟡 **Architecture complete.** All 15 design decisions locked via grilling session.
Ready for Phase 1 implementation.

See [docs/SUMMARY.md](docs/SUMMARY.md) for the full roadmap.

## License

MIT
