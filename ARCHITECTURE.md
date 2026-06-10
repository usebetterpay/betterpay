# BetterPay — Definitive Architecture

> **Indonesian billing framework** — Plugin-first architecture (Better Auth pattern), billing domain model (PayKit pattern), grounded in production code (wabase payment-gateway with 4 providers: Xendit, Midtrans, Duitku, Pakasir).
>
> **Status:** All 15 architectural decisions locked via grilling session (see `docs/DESIGN_DECISIONS.md`).

---

## Documentation Index

| Document | Description |
|----------|-------------|
| **ARCHITECTURE.md** (this file) | Complete architecture — three pillars, all layers, implementation details |
| **[docs/DESIGN_DECISIONS.md](docs/DESIGN_DECISIONS.md)** | 15 decisions with evidence, options considered, rationale |
| **[docs/paykit-feature-mapping.md](docs/paykit-feature-mapping.md)** | 182 PayKit features mapped to BetterPay |
| **[docs/provider-research-2026.md](docs/provider-research-2026.md)** | Provider pricing, APIs, BI regulations, QRIS data |
| **[COMPARISON.md](COMPARISON.md)** | Better Auth vs BetterPay architecture comparison |

---

## What Is BetterPay

BetterPay adalah billing framework untuk Indonesia yang menyatukan multiple payment gateway di bawah satu API. User define plans di code, plug in provider, dan BetterPay handle subscription lifecycle, entitlement tracking, invoice generation, payment reconciliation, dan webhook processing — tanpa user perlu tahu detail API masing-masing provider.

**Foundation:** Bukan greenfield. BetterPay dibangun di atas `@repo/payment-gateway` (wabase) yang sudah production-grade dengan 4 provider terintegrasi, state machine, circuit breaker, reconciliation worker, dan replay protection.

**15 Key Decisions (all locked):**
1. **Framework** (not standalone service) — embed di app user
2. **BetterPay-managed billing cycle** — karena 80-90% metode pembayaran Indonesia tidak support auto-debit
3. **Priority-based provider selection** — auto-fallback dengan circuit breaker
4. **Cron template + runBillingCycle()** — framework-specific cron generation via CLI
5. **API-only checkout** — provider serves checkout UI (Midtrans Snap, Xendit Payment Link)
6. **Auto-migrate dev, block prod** — CLI push for production
7. **Plugin-based notifications** — core fires events, plugins send
8. **Proxy client SDK** — type inference dari server instance
9. **Transaction record matching** — DB as source of truth
10. **Extract providers, rewrite rest** — wabase adapters + new framework
11. **Full test pyramid + test clock** — time simulation for billing
12. **Layered: core + billing plugin** — progressive complexity
13. **Single merchant** — multi-tenancy = user's responsibility
14. **Refunds deferred to v2** — VA/QRIS can't refund via API
15. **MVP: one-time + 2 providers** → billing → polish

---

## Three Pillars

```
┌─────────────────────────────────────────────────────────────────────┐
│                         BetterPay                                    │
│                                                                      │
│   Pillar 1: ARCHITECTURE (from Better Auth)                         │
│   ├── Plugin-first design                                           │
│   ├── better-call type-safe API router                              │
│   ├── Hook system (before/after with matchers)                      │
│   ├── Database hooks (before/after CRUD)                            │
│   ├── Transaction-aware hook queue                                  │
│   ├── Adapter factory (multi-DB)                                    │
│   ├── Multi-framework handlers                                      │
│   └── Client SDK + framework adapters                               │
│                                                                      │
│   Pillar 2: DOMAIN MODEL (from PayKit)                              │
│   ├── Plan & Feature DSL (feature(), plan())                        │
│   ├── Entitlement engine (lazy reset, stacked CTE)                  │
│   ├── Subscription state machine (5 states)                         │
│   ├── Normalized webhook events + action system                     │
│   ├── Product sync + versioning                                     │
│   ├── Webhook idempotency pipeline                                  │
│   └── Test clock / time simulation                                  │
│                                                                      │
│   Pillar 3: PAYMENT INFRA (from wabase, production-proven)          │
│   ├── Provider adapter pattern (Xendit, Midtrans, Duitku, Pakasir) │
│   ├── Circuit breaker per provider                                  │
│   ├── Retry with exponential backoff + jitter                       │
│   ├── Replay protection (timestamp window)                          │
│   ├── Reconciliation worker (poll for missed webhooks)              │
│   ├── Idempotency keys (atomic INSERT)                              │
│   ├── State machine (payment status transitions)                    │
│   ├── Per-provider signature verification                           │
│   ├── Error taxonomy (retryable vs terminal)                        │
│   └── Encrypted credential storage (AES-256-GCM)                    │
│                                                                      │
│   Framework: Agnostic (Next/Hono/Express/Fastify/Bun/Cloudflare)    │
│   UI: Optional (@betterpay/ui or build your own)                    │
│   Currency: IDR first (ISO 4217 minor units ready)                  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Quick Start

```typescript
// billing.ts
import { betterPay } from "@betterpay/core";
import { midtrans } from "@betterpay/midtrans";
import { xendit } from "@betterpay/xendit";
import { duitku } from "@betterpay/duitku";
import { whatsapp } from "@betterpay/notification-whatsapp";
import { free, pro, enterprise } from "./plans";

export const pay = betterPay({
  database: process.env.DATABASE_URL!,

  products: [free, pro, enterprise],

  plugins: [
    midtrans({
      serverKey: process.env.MIDTRANS_SERVER_KEY!,
      isSandbox: process.env.NODE_ENV !== "production",
    }),
    xendit({
      apiKey: process.env.XENDIT_API_KEY!,
      webhookSecret: process.env.XENDIT_WEBHOOK_SECRET!,
    }),
    duitku({
      apiKey: process.env.DUITKU_API_KEY!,
      merchantCode: process.env.DUITKU_MERCHANT_CODE!,
    }),
    whatsapp({ apiKey: process.env.WA_API_KEY! }),
  ],

  identify: async (request) => {
    const session = await auth.getSession(request);
    return session ? { customerId: session.user.id, email: session.user.email } : null;
  },
});
```

```typescript
// plans.ts
import { feature, plan } from "@betterpay/core";

const messages = feature({ id: "messages", type: "metered" });
const aiModels = feature({ id: "ai_models", type: "boolean" });

export const free = plan({
  id: "free", group: "base", default: true, name: "Free",
  includes: [messages({ limit: 100, reset: "month" })],
});

export const pro = plan({
  id: "pro", group: "base", name: "Pro",
  price: { amount: 199_000, currency: "IDR", interval: "month" },
  includes: [messages({ limit: 5_000, reset: "month" }), aiModels()],
});

export const enterprise = plan({
  id: "enterprise", group: "base", name: "Enterprise",
  price: { amount: 999_000, currency: "IDR", interval: "month" },
  includes: [messages({ limit: 50_000, reset: "month" }), aiModels()],
});
```

```typescript
// app/api/pay/[...all]/route.ts (Next.js)
import { payHandler } from "@betterpay/next";
import { pay } from "@/billing";
export const { GET, POST } = payHandler(pay);
```

---

## Monorepo Structure

```
betterpay/
├── packages/
│   │
│   │  ═══ Core ═══
│   ├── core/                        # Framework-agnostic core
│   │   └── src/
│   │       ├── api/                 # createPayEndpoint (better-call)
│   │       ├── cli/                 # npx @betterpay/cli
│   │       ├── client/              # Client SDK core
│   │       ├── context/             # PayContext, transaction, async_hooks
│   │       ├── db/
│   │       │   ├── adapter/         # Adapter factory (pg, memory)
│   │       │   ├── schema/          # Core tables
│   │       │   └── migrations/
│   │       ├── entitlement/         # Feature gating + usage billing (PayKit)
│   │       ├── error/               # Error codes, BetterPayError
│   │       ├── hooks/               # Before/after hook runner
│   │       ├── invoice/             # Invoice generation
│   │       ├── payment/             # Payment tracking
│   │       ├── plugin/              # Plugin loader, schema merger
│   │       ├── product/             # Plan/product sync + versioning (PayKit)
│   │       ├── provider/            # Provider registry + interface
│   │       ├── subscription/        # Subscription state machine (PayKit)
│   │       ├── types/
│   │       ├── utils/               # ID generation, crypto, date helpers
│   │       └── webhook/             # Webhook pipeline (PayKit idempotency)
│   │
│   │  ═══ Provider Plugins ═══
│   │  (each wraps the proven wabase adapter)
│   ├── midtrans/                    # Midtrans Snap adapter
│   │   └── wraps: MidtransAdapter (from @repo/payment-gateway)
│   ├── xendit/                      # Xendit Payment Sessions adapter
│   │   └── wraps: XenditAdapter
│   ├── duitku/                      # Duitku adapter
│   │   └── wraps: DuitkuAdapter
│   ├── pakasir/                     # Pakasir adapter
│   │   └── wraps: PakasirAdapter
│   │
│   │  ═══ Notification Plugins ═══
│   ├── notification-email/
│   ├── notification-whatsapp/
│   ├── notification-sms/
│   │
│   │  ═══ Compliance Plugins ═══
│   ├── compliance-ojk/
│   ├── reconciliation/              # Settlement reconciliation
│   │
│   │  ═══ DB Adapters ═══
│   ├── drizzle-adapter/
│   ├── memory-adapter/              # For testing
│   │
│   │  ═══ Framework Handlers ═══
│   ├── next/                        # Next.js (App Router)
│   ├── hono/                        # Hono
│   ├── express/                     # Express
│   ├── fastify/                     # Fastify
│   ├── bun/                         # Bun.serve
│   ├── cloudflare/                  # Cloudflare Workers
│   │
│   │  ═══ Client SDKs ═══
│   ├── client/                      # Core client (fetch-based proxy)
│   ├── client-react/                # React hooks
│   ├── client-vue/                  # Vue composables
│   │
│   │  ═══ Optional UI ═══
│   └── ui/                          # Pre-built components (optional)
│       ├── pricing-table/
│       ├── billing-portal/
│       ├── checkout-form/
│       └── invoice-list/
│
├── docs/
├── demo/
├── e2e/
├── test/
└── patches/
```

---

## Payment Provider Layer (from wabase, production-proven)

Ini adalah **jantung** BetterPay — sudah battle-tested di production dengan 4 Indonesian payment gateway.

### Provider Interface

```typescript
// Already implemented in @repo/payment-gateway
interface PaymentProvider {
  readonly name: ProviderName;

  createTransaction(params: CreateTransactionParams): Promise<TransactionResult>;
  checkStatus(providerTransactionId: string): Promise<StatusResult>;
  cancelTransaction?(providerTransactionId: string): Promise<void>;

  verifyWebhookSignature(payload: string, signature: string): boolean;
  parseWebhook?(payload: string): CanonicalWebhookEvent;

  getApiEndpoint(): string;
}
```

### Provider Adapters (4 implemented)

| Provider | Adapter | API | Auth | Signature |
|----------|---------|-----|------|-----------|
| **Midtrans** | `MidtransAdapter` | `POST /snap/v1/transactions` | `Basic base64(serverKey:)` | SHA512(orderId + statusCode + grossAmount + serverKey) |
| **Xendit** | `XenditAdapter` | `POST /payment_sessions` | `Basic base64(apiKey:)` | Token comparison (x-callback-token header) |
| **Duitku** | `DuitkuAdapter` | `POST /webapi/merchant/v2/inquiry` | Body signature (MD5) | SHA256(merchantCode + amount + orderId + apiKey) |
| **Pakasir** | `PakasirAdapter` | `POST /api/transaction` | API key in body | Project slug match |

### Per-Provider Status Mapping

```
Midtrans:  capture/settlement → completed, pending → active, deny/failure → failed, cancel → canceled, expire → expired
Xendit:    COMPLETED/SUCCEEDED → completed, PENDING/ACTIVE → active, FAILED → failed, EXPIRED → expired, CANCELLED → canceled
Duitku:    00 → completed, 01 → failed, 02 → canceled
Pakasir:   completed/success → completed, pending/processing → active, failed → failed, expired → expired, canceled → canceled
```

### Reliability Primitives (all implemented)

```
┌──────────────────────────────────────────────────────────┐
│  createTransaction()                                      │
│  │                                                        │
│  ├─ validateOrderId()          max 50 chars, [a-zA-Z0-9._~-] │
│  ├─ validateAmount()           integer, > 0              │
│  ├─ computeIdempotencyKey()    SHA-256 fingerprint       │
│  ├─ repository.checkIdempotencyKey()  atomic check       │
│  │                                                        │
│  ├─ repository.createTransaction()   status: "pending"   │
│  ├─ repository.recordEvent()         seq 1: created      │
│  │                                                        │
│  ├─ withRetry(                                              │
│  │    withTimeout(                                          │
│  │      circuitBreaker.execute(                             │
│  │        provider.createTransaction()                      │
│  │      )                                                  │
│  │    )                                                    │
│  │  )                                                      │
│  │                                                        │
│  ├─ repository.updateTransactionStatus()  "active"       │
│  ├─ repository.recordEvent()         seq 2: activated    │
│  ├─ repository.setIdempotencyKey()   cache result        │
│  ├─ repository.createReconciliationJob()  T+5min         │
│  │                                                        │
│  └─ return TransactionResult                              │
└──────────────────────────────────────────────────────────┘
```

| Primitive | Config | Implementation |
|-----------|--------|---------------|
| **Circuit Breaker** | failureThreshold: 5, successThreshold: 3, resetTimeout: 60s | Per-provider, 3 states (closed/open/half-open) |
| **Retry** | maxAttempts: 3, baseDelay: 1s, maxDelay: 5s | Exponential backoff + full jitter |
| **Timeout** | default: 30s | Per-request, configurable |
| **Replay Protection** | maxAge: 5min, clockSkew: 30s | Timestamp window validation |
| **Idempotency** | expiresAt: 24h | Atomic INSERT, fingerprint check |
| **State Machine** | 6 states, strict transitions | Validates before every status update |

### State Machine

```
Internal (PaymentStatus):
  pending → processing → success → refunded
                ↘ failed
  pending → expired

External (TransactionStatus):
  pending → active → completed (TERMINAL)
      │         ↘ expired  (TERMINAL)
      │         ↘ canceled (TERMINAL)
      │         ↘ failed   (TERMINAL)
      └→ completed / expired / canceled / failed (all from pending)
```

### Reconciliation Worker

```
Every 1 minute:
  1. Pick up due jobs (status=scheduled, scheduledFor <= now)
  2. For each job:
     a. Get transaction from DB
     b. Skip if already terminal
     c. Poll provider: checkStatus(providerTransactionId)
     d. If status differs → validateTransition → updateStatus
     e. Mark job completed
  3. On failure: re-schedule with exponential backoff (max 5 attempts)
```

### Webhook Signature Verification

```typescript
// Midtrans: SHA512(order_id + status_code + gross_amount + server_key)
// - Signature IN the JSON body (signature_key field)
verifyMidtransSignature(payload, signature, serverKey): boolean

// Xendit: Token comparison
// - Signature IN header (x-callback-token)
verifyXenditSignature(payload, signature, webhookToken): boolean

// Duitku: SHA256(merchantCode + amount + merchantOrderId + apiKey)
// - Signature IN header (x-signature)
verifyDuitkuSignature(payload, signature, apiKey): boolean

// Pakasir: Project slug match
// - Signature IN header (x-signature)
verifyPakasirSignature(payload, signature, projectSlug): boolean
```

### Error Taxonomy

```typescript
PaymentError (base)
├── PaymentValidationError       (400, retryable: false)
├── PaymentAuthError             (401, retryable: false)
├── PaymentNotFoundError         (404, retryable: false)
├── PaymentSignatureError        (401, retryable: false)
├── PaymentProviderError         (429/5xx, retryable: true)
├── PaymentTimeoutError          (408, retryable: true)
├── PaymentRateLimitError        (429, retryable: true)
├── PaymentCircuitOpenError      (503, retryable: true)
├── PaymentConflictError         (409, retryable: false)
├── InvalidStateTransitionError  (400, retryable: false)
├── PaymentIdempotencyError      (409, retryable: false)
├── PaymentWebhookError          (400, retryable: false)
└── PaymentReplayProtectionError (400, retryable: false)
```

### Database Schema (payment tables — from wabase, production)

```sql
-- 6 tables, prefix: payment_

payment_transaction       -- Materialized state of each payment
payment_event             -- Append-only audit log (every state change)
payment_webhook_event     -- Webhook dedup + signature audit
payment_idempotency_key   -- Prevents duplicate creation (24h TTL)
payment_reconciliation_job -- Scheduled provider polls
payment_gateway_config    -- Encrypted credentials per provider (AES-256-GCM)
```

---

## Billing Domain Layer (from PayKit patterns)

This layer sits ON TOP of the payment provider layer and adds subscription lifecycle, entitlement tracking, and product management.

### Plan & Feature DSL

```typescript
import { feature, plan } from "@betterpay/core";

// Define features (what you gate/meter)
const messages = feature({ id: "messages", type: "metered" });
const aiModels = feature({ id: "ai_models", type: "boolean" });

// Define plans (bundles of features with pricing)
export const pro = plan({
  id: "pro",
  group: "base",
  name: "Pro",
  price: { amount: 199_000, currency: "IDR", interval: "month" },
  includes: [
    messages({ limit: 5_000, reset: "month" }),
    aiModels(),
  ],
});
```

**Validation:** Zod schemas enforce:
- Plan ID: lowercase alphanumeric + dash/underscore, max 64 chars
- Price amount: positive integer (IDR), max 999,999,999,999
- Feature type: `"boolean"` | `"metered"`
- Metered config: `{ limit: positive int, reset: "day"|"week"|"month"|"year" }`

**Normalization:** `normalizeSchema()` converts plans → `NormalizedSchema` with sorted features, plans, and planMap. `computePlanHash()` generates SHA-256 fingerprint for change detection.

### Entitlement Engine

```typescript
// Check (read-only, lazy reset)
const result = await pay.api.check({
  customerId: "user_123",
  featureId: "messages",
});
// → { allowed: true, balance: { limit: 5000, remaining: 4200, resetAt: Date, unlimited: false } }

// Report (deduct, atomic)
const result = await pay.api.report({
  customerId: "user_123",
  featureId: "messages",
  amount: 1,
});
// → { success: true, balance: { remaining: 4199 } }
```

**Lazy reset:** Balance auto-resets when `nextResetAt <= now`. No cron job needed.

**Stacked deductions:** Multiple entitlements for same feature → aggregate balance. Fast path: single CTE query. Fallback: `FOR UPDATE` lock + greedy deduct.

### Subscription State Machine

```
         ┌───────────┐
         │ scheduled  │ ◀── downgrade / cancel-to-free
         └─────┬─────┘
               │ activate at period end
               ▼
         ┌───────────┐     upgrade      ┌────────┐
         │  active    │ ──────────────▶  │ ended  │
         │  trialing  │ ◀── resume       └────────┘
         │  past_due  │ ──────────────▶  ┌────────┐
         └───────────┘   cancel at end   │canceled│
                                         └────────┘
```

**Key transitions:**
- Same plan + pending cancel → Resume
- First subscribe (free) → Activate directly
- First subscribe (paid) → Payment link via provider → Webhook completes
- Upgrade → Immediate switch
- Downgrade → Schedule at period end
- Cancel to free → Cancel paid, schedule free at period end

### Product Sync & Versioning

- Products are versioned (`version` integer, auto-increment)
- Plan hash (SHA-256) detects config changes
- `betterpay push` CLI: dry-run diff → apply migrations → sync products to all providers
- Dev-mode startup: warn if products out-of-sync

### Webhook Idempotency Pipeline

```
Provider webhook → /pay/api/webhook/:provider
  │
  ├─ 1. provider.verifyWebhookSignature()   (SHA512/HMAC/token)
  ├─ 2. provider.parseWebhook()              → CanonicalWebhookEvent
  ├─ 3. validateTimestamp()                  (replay protection, 5min window)
  ├─ 4. repository.recordWebhook()           (UNIQUE constraint = dedup)
  │     └─ If duplicate → return { wasDuplicate: true }
  ├─ 5. Find transaction by orderId
  ├─ 6. validateTransactionTransition()      (state machine check)
  ├─ 7. repository.updateTransactionStatus() (apply new status)
  ├─ 8. repository.recordEvent()             (audit log)
  └─ 9. Emit customer.updated event
```

---

## Plugin System (from Better Auth)

### BetterPayPlugin Interface

```typescript
interface BetterPayPlugin {
  id: string;
  version?: string;

  // Lifecycle
  init?: (ctx: PayContext) => Promise<void>;

  // HTTP
  endpoints?: Record<string, PayEndpoint>;
  middlewares?: Array<{ path: string; middleware: PayMiddleware }>;
  onRequest?: (req: Request, ctx: PayContext) => Promise<{ response: Response } | void>;
  onResponse?: (res: Response, ctx: PayContext) => Promise<void>;

  // Hooks
  hooks?: {
    before?: Array<{ matcher: (ctx: HookContext) => boolean; handler: PayMiddleware }>;
    after?: Array<{ matcher: (ctx: HookContext) => boolean; handler: PayMiddleware }>;
  };

  // Database
  schema?: PluginDBSchema;
  migrations?: Record<string, Migration>;

  // Provider
  providers?: PaymentProvider[];
  defaultProvider?: string;

  // Notifications
  notificationChannels?: NotificationChannel[];

  // Rate Limiting
  rateLimit?: Array<{ window: number; max: number; pathMatcher: (path: string) => boolean }>;

  // Type Safety
  $ERROR_CODES?: Record<string, RawError>;
  $Infer?: Record<string, unknown>;
}
```

### Provider Plugin Example (wraps proven wabase adapter)

```typescript
// packages/midtrans/src/index.ts
import { MidtransAdapter } from "@repo/payment-gateway/providers/midtrans";
import type { BetterPayPlugin } from "@betterpay/core";

export const midtrans = (config: MidtransConfig): BetterPayPlugin => ({
  id: "midtrans",
  version: "1.0.0",

  async init(ctx) {
    // Test connection
    const adapter = new MidtransAdapter(config);
    ctx.logger.info(`Midtrans: ${config.isSandbox ? "sandbox" : "production"}`);
  },

  providers: [new MidtransAdapter(config)],

  schema: {
    midtransConfig: {
      fields: {
        serverKey: { type: "string", required: true },
        clientKey: { type: "string" },
        isSandbox: { type: "boolean", defaultValue: false },
      },
    },
  },

  $ERROR_CODES: {
    MIDTRANS_CREATE_ERROR: { code: "MIDTRANS_CREATE_ERROR", message: "..." },
    MIDTRANS_STATUS_ERROR: { code: "MIDTRANS_STATUS_ERROR", message: "..." },
  },
});
```

### Database Hooks

```typescript
const pay = betterPay({
  databaseHooks: {
    subscription: {
      create: {
        after: async (sub) => {
          await sendWelcomeEmail(sub.customerId);
        },
      },
    },
    payment: {
      create: {
        after: async (payment) => {
          await sendReceiptWhatsApp(payment);
        },
      },
    },
  },
});
```

### Transaction-Aware Hook Queue

```typescript
// Hooks fire AFTER transaction commits — no phantom notifications
await runWithTransaction(db, async () => {
  await createSubscription(tx, ...);
  await createEntitlements(tx, ...);
  await queueAfterCommit(async () => {
    await sendInvoiceEmail(invoice);  // Only fires after COMMIT
  });
});
```

---

## API Layer (better-call powered)

```typescript
// Endpoint definition with full type inference
export const subscribe = createPayEndpoint(
  "/subscribe",
  {
    method: "POST",
    body: z.object({
      planId: z.string(),
      paymentMethod: z.enum(["virtual_account", "ewallet", "qris", "credit_card"]).optional(),
      providerId: z.string().optional(),
      successUrl: z.url(),
    }),
    client: true,  // Exposed to client SDK
  },
  async (ctx) => {
    return subscribeToPlan(ctx.pay, { ...ctx.body, customerId: ctx.customer.id });
  }
);
```

### Built-in Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/subscribe` | Subscribe to plan |
| GET | `/customer` | Get customer details |
| POST | `/customer` | Create/update customer |
| GET | `/customers` | List customers |
| POST | `/check` | Check entitlement balance |
| POST | `/report` | Report usage (deduct) |
| GET | `/invoices` | List invoices |
| POST | `/webhook/:provider` | Provider webhook receiver |
| POST | `/reconcile` | Trigger reconciliation |

### Rate Limiting (multi-storage)

```typescript
rateLimit: {
  enabled: true,
  storage: "secondary-storage",  // "memory" | "database" | "secondary-storage"
  window: 10, max: 100,
  customRules: {
    "/subscribe": { window: 60, max: 5 },
    "/webhook": { window: 1, max: 200 },
  },
}
```

---

## Client SDK

```typescript
// Core client (framework agnostic)
import { createPayClient } from "@betterpay/client";
const pay = createPayClient({ baseURL: "/pay" });
await pay.subscribe({ planId: "pro", successUrl: "/success" });

// React hooks
import { useSubscription, useEntitlement } from "@betterpay/client-react";
const { subscription } = useSubscription();
const { balance } = useEntitlement("messages");
```

---

## Framework Handlers

```typescript
// Next.js — 6 lines
export function payHandler(pay) {
  return { GET: pay.handler, POST: pay.handler };
}

// Hono — 3 lines
export function payHandler(pay) {
  return async (c) => pay.handler(c.req.raw);
}

// Express — 15 lines (convert req → Request)
// Fastify — 15 lines (convert req → Request)
// Bun — 3 lines (Bun uses standard Request)
// Cloudflare — 3 lines (Workers uses standard Request)
```

---

## Optional UI Package

```tsx
// @betterpay/ui — use it or build your own
import { PricingTable, BillingPortal, CheckoutForm } from "@betterpay/ui";

<PricingTable plans={[free, pro, enterprise]} currency="IDR" locale="id-ID" />
<BillingPortal customer={user} tabs={["subscription", "invoices"]} />
<CheckoutForm amount={199_000} providers={[midtrans, xendit]} />
```

---

## Complete Database Schema

```sql
-- ═══ Core billing tables (from PayKit patterns) ═══
betterpay_customer              -- Customer data + phone
betterpay_product               -- Plan definitions (versioned)
betterpay_product_provider      -- Plan ↔ Provider product mapping
betterpay_feature               -- Feature definitions (boolean/metered)
betterpay_product_feature       -- Plan ↔ Feature mapping (join)
betterpay_subscription          -- Subscription lifecycle
betterpay_subscription_provider -- Sub ↔ Provider sub mapping
betterpay_entitlement           -- Feature balance tracking
betterpay_invoice               -- Invoice records
betterpay_payment               -- Actual money movements
betterpay_webhook_event         -- Webhook idempotency log

-- ═══ Payment infra tables (from wabase, production-proven) ═══
payment_transaction             -- Materialized payment state
payment_event                   -- Append-only audit log
payment_webhook_event           -- Webhook dedup + signature audit
payment_idempotency_key         -- Prevents duplicate creation
payment_reconciliation_job      -- Scheduled provider polls
payment_gateway_config          -- Encrypted credentials (AES-256-GCM)

-- ═══ Plugin-contributed tables ═══
betterpay_notification_log      -- (@betterpay/notification-*)
betterpay_settlement            -- (@betterpay/reconciliation)
betterpay_ojk_report            -- (@betterpay/compliance-ojk)
```

---

## ISO 4217 Currency Handling

```typescript
// IDR has 0 decimals — Rp 199,000 = 199000 (integer)
// USD has 2 decimals — $19.99 = 1999 (cents)
// VND has 0 decimals — 100,000 ₫ = 100000

const ISO_4217_DECIMALS = {
  IDR: 0, VND: 0, JPY: 0,     // No decimals
  USD: 2, SGD: 2, MYR: 2,     // 2 decimals
  PHP: 2, THB: 2,              // 2 decimals
};

// All amounts stored as integers in minor units
// Database: BIGINT for IDR (can exceed 2.1B)
```

---

## Summary

```
┌─────────────────────────────────────────────────────────────┐
│                      BetterPay                               │
│                                                              │
│  Architecture:  Better Auth (plugin-first, hooks, adapters) │
│  Domain:        PayKit (plans, subscriptions, entitlements)  │
│  Providers:     Midtrans + Xendit + Duitku + Pakasir        │
│                 (production-proven adapters from wabase)     │
│  Reliability:   Circuit breaker, retry, replay protection,  │
│                 reconciliation, idempotency, state machine   │
│  Framework:     Agnostic (Next/Hono/Express/Fastify/Bun/CF) │
│  UI:            Optional (@betterpay/ui or build your own)  │
│  Currency:      IDR first (ISO 4217 minor units ready)      │
│                                                              │
│  User writes:                                               │
│    betterPay({ plugins: [midtrans(...)], products: [...] })  │
│                                                              │
│  And gets:                                                  │
│    ✅ Payment processing (VA, e-wallet, QRIS, CC, retail)   │
│    ✅ Subscription lifecycle                                 │
│    ✅ Feature gating + usage billing                         │
│    ✅ Webhook reconciliation (poll missed webhooks)         │
│    ✅ Invoice generation + dunning                           │
│    ✅ Multi-channel notifications                            │
│    ✅ Circuit breaker per provider                           │
│    ✅ Replay attack protection                               │
│    ✅ Idempotency (no duplicate payments)                    │
│    ✅ Encrypted credential storage                           │
│    ✅ Append-only audit log                                  │
│                                                              │
│  Without knowing:                                           │
│    ❌ Midtrans Snap vs Core API                              │
│    ❌ Xendit Payment Sessions API                            │
│    ❌ Duitku MD5 signature format                            │
│    ❌ How webhooks differ between providers                  │
│    ❌ How to normalize different payment formats             │
│    ❌ Circuit breaker / retry / timeout logic                │
│                                                              │
│  That's the point.                                          │
└─────────────────────────────────────────────────────────────┘
```

---

*Architecture v4.0 — All 15 design decisions locked via grilling session*
*Patterns from: Better Auth (architecture) × PayKit (domain) × wabase (payment infra)*
*Last updated: 2026-06-10*
*See: docs/DESIGN_DECISIONS.md for full decision log with evidence*
