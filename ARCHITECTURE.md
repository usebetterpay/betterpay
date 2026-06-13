# BetterPay — Definitive Architecture

> **Indonesian billing framework** — Plugin-first architecture (Better Auth pattern), billing domain model (PayKit pattern), grounded in production code (wabase payment-gateway with 5 providers: Xendit, Midtrans, Duitku, Pakasir, Tripay).
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

**Foundation:** Bukan greenfield. BetterPay dibangun di atas `@repo/payment-gateway` (wabase) yang sudah production-grade dengan 5 provider terintegrasi, state machine, circuit breaker, reconciliation worker, dan replay protection.

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
│   ├── Provider adapter pattern (Xendit, Midtrans, Duitku, Pakasir, Tripay) │
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
│   UI: Planned v2 (@betterpay/ui or build your own)                  │
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
import { tripay } from "@betterpay/tripay";
import { billing, feature, plan } from "@betterpay/billing";
import { notificationWhatsapp } from "@betterpay/notification-whatsapp";
import { free, pro, enterprise } from "./plans";

export const pay = betterPay({
  database: process.env.DATABASE_URL!,

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
    tripay({
      apiKey: process.env.TRIPAY_API_KEY!,
      merchantCode: process.env.TRIPAY_MERCHANT_CODE!,
      privateKey: process.env.TRIPAY_PRIVATE_KEY!,
      isSandbox: process.env.NODE_ENV !== "production",
    }),
    billing({ products: [free, pro, enterprise] }),
    notificationWhatsapp({ apiKey: process.env.WA_API_KEY! }),
  ],

  identify: async (request) => {
    const session = await auth.getSession(request);
    return session ? { customerId: session.user.id, email: session.user.email } : null;
  },
});
```

```typescript
// plans.ts
import { feature, plan } from "@betterpay/billing";

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
│   │       ├── context.ts           # PayContext type
│   │       ├── plugin.ts            # BetterPayPlugin interface
│   │       ├── router.ts            # better-call router
│   │       ├── create-betterpay.ts  # Main factory (betterPay())
│   │       ├── billing-bridge.ts    # Structural types for billing plugin
│   │       ├── provider/            # Provider interface + registry
│   │       ├── transaction/         # Schema + service + state machine
│   │       ├── webhook/             # Handler + replay protection
│   │       ├── security/            # Middleware, rate limiter, encryption, validation
│   │       ├── errors/              # BetterPayError taxonomy
│   │       ├── reconciliation/      # Reconciliation worker
│   │       ├── logging/             # Logger system
│   │       ├── database/            # Migration runner
│   │       └── utils/               # Circuit breaker, retry, ID generation
│   │
│   │  ═══ Billing Plugin ═══
│   ├── billing/                     # Subscription + entitlement + invoice
│   │   └── src/
│   │       ├── schema.ts            # feature(), plan() DSL
│   │       ├── normalize.ts         # normalizeSchema(), computePlanHash()
│   │       ├── subscription/        # State machine + service
│   │       ├── entitlement/         # Check + report with lazy reset
│   │       ├── customer/            # Customer service
│   │       ├── invoice/             # Invoice generation
│   │       ├── billing-cycle/       # runBillingCycle()
│   │       ├── cron/                # Cron endpoint + template generator
│   │       ├── dunning/             # Dunning manager
│   │       └── test-clock.ts        # Time simulation for testing
│   │
│   │  ═══ Provider Plugins ═══
│   ├── midtrans/                    # Midtrans Snap adapter
│   ├── xendit/                      # Xendit Payment Sessions adapter
│   ├── duitku/                      # Duitku adapter
│   ├── pakasir/                     # Pakasir adapter
│   ├── tripay/                      # Tripay adapter
│   │
│   │  ═══ Notification Plugins ═══
│   ├── notification-email/
│   ├── notification-whatsapp/
│   │
│   │  ═══ DB Adapters ═══
│   ├── drizzle-adapter/             # PostgreSQL (Drizzle ORM)
│   │
│   │  ═══ Framework Handlers ═══
│   ├── next/                        # Next.js (App Router)
│   ├── hono/                        # Hono
│   ├── express/                     # Express
│   ├── bun/                         # Bun.serve
│   ├── cloudflare/                  # Cloudflare Workers
│   │
│   │  ═══ Tools ═══
│   ├── cli/                         # npx @betterpay/cli (init, push, status)
│   ├── client/                      # Core client (fetch-based proxy SDK)
│   │
│   │  ═══ Planned (v2) ═══
│   ├── notification-sms/            # Planned
│   ├── compliance-ojk/              # Planned
│   ├── reconciliation/              # Planned (standalone package; currently in core)
│   ├── memory-adapter/              # Planned
│   ├── fastify/                     # Planned
│   ├── client-react/                # Planned
│   ├── client-vue/                  # Planned
│   └── ui/                          # Planned (pricing-table, billing-portal, etc)
│
├── docs/                            # Fumadocs documentation website
├── demo/                            # Demo app with all providers + billing
└── sample/                          # Reference projects (better-auth, paykit)
```

---

## Payment Provider Layer (from wabase, production-proven)

Ini adalah **jantung** BetterPay — sudah battle-tested di production dengan 5 Indonesian payment gateway.

### Provider Interface

```typescript
// packages/core/src/provider/interface.ts
interface PaymentProvider {
  readonly id: string;
  readonly name: string;
  readonly paymentMethods: PaymentMethod[];
  readonly capabilities: ProviderCapabilities;

  createPaymentLink(data: CreatePaymentLinkInput): Promise<PaymentLinkResult>;
  verifyWebhook(data: WebhookData): Promise<boolean>;
  normalizeWebhook(data: WebhookData): Promise<NormalizedWebhookEvent[]>;
  getApiEndpoint(): string;

  checkStatus?(providerTransactionId: string): Promise<StatusResult>;
  cancelTransaction?(providerTransactionId: string): Promise<void>;
}
```

### Provider Adapters (5 implemented)

| Provider | Adapter | API | Auth | Signature |
|----------|---------|-----|------|-----------|
| **Midtrans** | `MidtransAdapter` | `POST /snap/v1/transactions` | `Basic base64(serverKey:)` | SHA512(orderId + statusCode + grossAmount + serverKey) |
| **Xendit** | `XenditAdapter` | `POST /payment_sessions` | `Basic base64(apiKey:)` | Token comparison (x-callback-token header) |
| **Duitku** | `DuitkuAdapter` | `POST /webapi/merchant/v2/inquiry` | Body signature (MD5) | SHA256(merchantCode + amount + orderId + apiKey) |
| **Pakasir** | `PakasirAdapter` | `POST /api/transaction` | API key in body | Project slug match |
| **Tripay** | `TripayProvider` | `POST /transaction/create` | `Bearer apiKey` | HMAC-SHA256(merchantCode + merchantRef + amount, privateKey) |

### Per-Provider Status Mapping

```
Midtrans:  capture/settlement → completed, pending → active, deny/failure → failed, cancel → canceled, expire → expired
Xendit:    COMPLETED/SUCCEEDED → completed, PENDING/ACTIVE → active, FAILED → failed, EXPIRED → expired, CANCELLED → canceled
Duitku:    00 → completed, 01 → failed, 02 → canceled
Pakasir:   completed/success → completed, pending/processing → active, failed → failed, expired → expired, canceled → canceled
Tripay:    PAID → completed, UNPAID → pending, EXPIRED → expired, FAILED → failed, REFUND → canceled
```

### Reliability Primitives (all implemented)

```
┌──────────────────────────────────────────────────────────┐
│  createTransaction() → provider.createPaymentLink()        │
│  │                                                        │
│  ├─ validateOrderId()          max 50 chars, [a-zA-Z0-9._~-] │
│  ├─ validateAmount()           integer, > 0              │
│  │                                                        │
│  ├─ transactionService.create()   status: "pending"      │
│  │                                                        │
│  ├─ withRetry(                                              │
│  │    withTimeout(                                          │
│  │      circuitBreaker.execute(                             │
│  │        provider.createPaymentLink()                      │
│  │      )                                                  │
│  │    )                                                    │
│  │  )                                                      │
│  │                                                        │
│  ├─ transactionService.updateStatus()  "active"          │
│  │                                                        │
│  └─ return { orderId, paymentUrl, providerTransactionId }│
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

// Tripay: HMAC-SHA256(merchantCode + merchantRef + amount, privateKey)
// - Signature IN header (x-callback-signature)
verifyTripayCallbackSignature(payload, signature, privateKey): boolean
```

### Error Taxonomy

```typescript
BetterPayError (base)
├── ValidationError              (400, VALIDATION_ERROR)
├── NotFoundError                (404, NOT_FOUND)
├── UnauthorizedError            (401, UNAUTHORIZED)
├── ForbiddenError               (403, FORBIDDEN)
├── ConflictError                (409, CONFLICT)
├── RateLimitError               (429, RATE_LIMIT_EXCEEDED)
├── ProviderError                (502, PROVIDER_ERROR, retryable: configurable)
├── WebhookError                 (400, WEBHOOK_ERROR)
├── BillingError                 (400, BILLING_ERROR)
├── DunningError                 (400, DUNNING_ERROR)
├── ReconciliationError          (500, RECONCILIATION_ERROR)
├── EncryptionError              (500, ENCRYPTION_ERROR)
└── MigrationError               (500, MIGRATION_ERROR)
```

### Database Schema (payment tables — from wabase, production)

```sql
-- Drizzle adapter: @betterpay/drizzle-adapter (PostgreSQL)

-- Core billing tables (prefix: betterpay_)
betterpay_customer              -- Customer data + phone
betterpay_product               -- Plan definitions (versioned, with hash)
betterpay_feature               -- Feature definitions (boolean/metered)
betterpay_product_feature       -- Plan ↔ Feature mapping (join)
betterpay_subscription          -- Subscription lifecycle (5 states)
betterpay_entitlement           -- Feature balance tracking (lazy reset)
betterpay_invoice               -- Invoice records

-- Payment infra tables (prefix: payment_)
payment_transaction             -- Materialized payment state
payment_event                   -- Append-only audit log
payment_webhook_event           -- Webhook dedup + signature audit
payment_idempotency_key         -- Prevents duplicate creation (24h TTL)

-- Planned (v2):
-- payment_reconciliation_job    -- Scheduled provider polls
-- payment_gateway_config        -- Encrypted credentials per provider
```

---

## Billing Domain Layer (from PayKit patterns)

This layer sits ON TOP of the payment provider layer and adds subscription lifecycle, entitlement tracking, and product management.

### Plan & Feature DSL

```typescript
import { feature, plan } from "@betterpay/billing";

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
const result = await pay.billing.check({
  customerId: "user_123",
  featureId: "messages",
});
// → { allowed: true, balance: { limit: 5000, remaining: 4200, resetAt: Date, unlimited: false } }

// Report (deduct, atomic)
const result = await pay.billing.report({
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
         ┌───────────┐                   ┌────────┐
         │  active    │ ──────────────▶  │ ended  │
         │  past_due  │ ◀── resume       └────────┘
         └───────────┘   cancel at end   ┌────────┐
                                         │canceled│
                                         └────────┘

  Valid transitions (from state-machine.ts):
    scheduled → active, canceled
    active    → past_due, canceled, ended
    past_due  → active, canceled, ended
    ended     → scheduled (re-subscribe)
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
  ├─ 1. provider.verifyWebhook(data)          (async, returns boolean)
  ├─ 2. provider.normalizeWebhook(data)       → NormalizedWebhookEvent[]
  ├─ 3. validateTimestamp()                   (replay protection, 5min window)
  ├─ 4. repository.recordWebhook()            (UNIQUE constraint = dedup)
  │     └─ If duplicate → return { wasDuplicate: true }
  ├─ 5. Find transaction by orderId
  ├─ 6. validateTransactionTransition()       (state machine check)
  ├─ 7. repository.updateTransactionStatus()  (apply new status)
  ├─ 8. repository.recordEvent()              (audit log)
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

### Provider Plugin Example

```typescript
// packages/midtrans/src/index.ts
import type { BetterPayPlugin } from "@betterpay/core";
import { MidtransProvider } from "./adapter";

export interface MidtransConfig {
  serverKey: string;
  clientKey?: string;
  isSandbox?: boolean;
}

export function midtrans(config: MidtransConfig): BetterPayPlugin {
  return {
    id: "midtrans",
    version: "0.1.0",
    providers: [new MidtransProvider(config)],
    $ERROR_CODES: {
      MIDTRANS_CREATE_ERROR: { code: "MIDTRANS_CREATE_ERROR", message: "Failed to create Midtrans payment" },
      MIDTRANS_STATUS_ERROR: { code: "MIDTRANS_STATUS_ERROR", message: "Failed to check Midtrans status" },
    },
  };
}
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

## Security Middleware

BetterPay provides a flexible middleware system that allows user applications to inject their own authentication, CSRF protection, and authorization logic. **This follows the library pattern: BetterPay provides the hooks, user apps implement the policies.**

### Security Responsibility Model

| Layer | Responsibility | Implementation |
|-------|---------------|----------------|
| **Input Validation** | BetterPay | Zod schemas for all endpoints |
| **Webhook Security** | BetterPay | Signature verification + replay protection |
| **Error Sanitization** | BetterPay | Generic errors to clients, detailed logs |
| **Request Size Limits** | BetterPay | 10MB max, prevents DoS |
| **Rate Limiting** | BetterPay | In-memory or distributed |
| **Authentication** | **User App** | Via `requireAuth()` middleware |
| **CSRF Protection** | **User App** | Via `validateCSRF()` middleware |
| **Authorization** | **User App** | Via `requireRole()` or `validateOwnership()` |
| **Audit Logging** | **User App** | Via `after` middleware hook |

### Middleware Types

```typescript
interface SecurityMiddleware {
  before?: SecurityMiddlewareFn[];   // Run before request processing
  after?: SecurityMiddlewareFn[];    // Run after request processing
  onError?: (error, ctx) => Response | void;  // Custom error handler
}

type SecurityMiddlewareFn = (ctx: SecurityContext) => Response | void | Promise<Response | void>;

interface SecurityContext {
  request: Request;
  user?: { id: string; email?: string; role?: string; [key: string]: unknown };
  metadata: { requestId: string; startTime: number; [key: string]: unknown };
}
```

### Built-in Middleware Helpers

#### 1. `requireAuth()` — Authentication

```typescript
import { betterPay, requireAuth } from '@betterpay/core';
import { auth } from '@/lib/auth';  // Your auth system (NextAuth, Clerk, etc.)

const pay = betterPay({
  plugins: [/* ... */],
  middleware: {
    before: [
      requireAuth({
        auth: async (request) => {
          const session = await auth.getSession(request);
          if (!session?.user) return null;
          
          return {
            id: session.user.id,
            email: session.user.email,
            role: session.user.role,
          };
        },
        errorMessage: 'Please login to continue',
        statusCode: 401,
      }),
    ],
  },
});
```

#### 2. `validateCSRF()` — CSRF Protection

```typescript
import { betterPay, validateCSRF } from '@betterpay/core';

const pay = betterPay({
  middleware: {
    before: [
      validateCSRF({
        trustedOrigins: [
          'https://myapp.com',
          'https://*.myapp.com',  // Wildcard support
        ],
        errorMessage: 'Invalid origin',
        statusCode: 403,
      }),
    ],
  },
});
```

#### 3. `requireRole()` — Role-Based Access Control

```typescript
import { betterPay, requireAuth, requireRole } from '@betterpay/core';

const pay = betterPay({
  middleware: {
    before: [
      requireAuth({ auth: /* ... */ }),
      requireRole({
        roles: ['admin', 'finance'],
        errorMessage: 'Insufficient permissions',
        statusCode: 403,
      }),
    ],
  },
});
```

#### 4. `validateOwnership()` — Resource Ownership

```typescript
import { betterPay, requireAuth, validateOwnership } from '@betterpay/core';

const pay = betterPay({
  middleware: {
    before: [
      requireAuth({ auth: /* ... */ }),
      validateOwnership({
        getResourceOwnerId: async (ctx) => {
          const url = new URL(ctx.request.url);
          const orderId = url.pathname.split('/').pop();
          const order = await db.orders.findById(orderId);
          return order?.customerId ?? null;
        },
        errorMessage: 'You do not own this resource',
        statusCode: 403,
      }),
    ],
  },
});
```

#### 5. Audit Logging (after hook)

```typescript
import type { SecurityMiddleware } from '@betterpay/core';

const auditLogger: SecurityMiddleware = async (ctx) => {
  await db.auditLogs.create({
    userId: ctx.user?.id,
    action: `${ctx.request.method} ${new URL(ctx.request.url).pathname}`,
    timestamp: new Date(),
    ip: ctx.request.headers.get('x-forwarded-for'),
    metadata: ctx.metadata,
  });
  return undefined;  // Continue processing
};

const pay = betterPay({
  middleware: {
    after: [auditLogger],
  },
});
```

### Middleware Execution Order

```
Request
  ↓
[1] CSRF validation
  ↓
[2] Authentication
  ↓
[3] Authorization (role/ownership)
  ↓
[4] Request processing (router)
  ↓
[5] Audit logging
  ↓
Response
```

If any middleware returns a `Response`, the chain stops immediately.

### Complete Security Example

```typescript
import { betterPay, requireAuth, validateCSRF, validateOwnership } from '@betterpay/core';
import { midtrans } from '@betterpay/midtrans';
import { billing, feature, plan } from '@betterpay/billing';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

// Define plans
const messages = feature({ id: 'messages', type: 'metered' });
const pro = plan({
  id: 'pro',
  group: 'base',
  price: { amount: 199000, currency: 'IDR', interval: 'month' },
  includes: [messages({ limit: 5000, reset: 'month' })],
});

// Audit logger
const auditLogger = async (ctx) => {
  await db.auditLogs.create({
    userId: ctx.user?.id,
    action: `${ctx.request.method} ${new URL(ctx.request.url).pathname}`,
    timestamp: new Date(),
    ip: ctx.request.headers.get('x-forwarded-for'),
    metadata: ctx.metadata,
  });
  return undefined;
};

// Custom error handler
const errorHandler = async (error, ctx) => {
  console.error('Payment error:', {
    error: error.message,
    userId: ctx.user?.id,
    requestId: ctx.metadata.requestId,
  });
  
  return new Response(JSON.stringify({
    error: 'An error occurred processing your payment',
    requestId: ctx.metadata.requestId,
  }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' },
  });
};

// Create BetterPay instance with full security
export const pay = betterPay({
  plugins: [
    midtrans({
      serverKey: process.env.MIDTRANS_SERVER_KEY!,
      isSandbox: process.env.NODE_ENV !== 'production',
    }),
    billing({ products: [pro] }),
  ],
  
  middleware: {
    before: [
      // 1. CSRF protection
      validateCSRF({
        trustedOrigins: ['https://myapp.com', 'https://*.myapp.com'],
      }),
      
      // 2. Authentication
      requireAuth({
        auth: async (request) => {
          const session = await auth.getSession(request);
          if (!session?.user) return null;
          
          return {
            id: session.user.id,
            email: session.user.email,
            role: session.user.role,
          };
        },
      }),
      
      // 3. Resource ownership
      validateOwnership({
        getResourceOwnerId: async (ctx) => {
          const url = new URL(ctx.request.url);
          
          if (url.pathname.includes('/subscription/')) {
            const subscriptionId = url.pathname.split('/').pop();
            const sub = await db.subscriptions.findById(subscriptionId);
            return sub?.customerId ?? null;
          }
          
          if (url.pathname.includes('/status/')) {
            const orderId = url.pathname.split('/').pop();
            const order = await db.orders.findById(orderId);
            return order?.customerId ?? null;
          }
          
          return null;
        },
      }),
    ],
    
    after: [auditLogger],
    onError: errorHandler,
  },
});
```

### Security Best Practices

1. **Always use CSRF protection** for browser-based applications
2. **Authenticate before authorize** — order matters
3. **Validate ownership** for user-specific resources
4. **Log everything** — use audit logging for compliance
5. **Custom error handlers** — never expose stack traces in production
6. **Rate limit sensitive endpoints** — use built-in rate limiter
7. **Use HTTPS** — BetterPay assumes HTTPS in production

### Learn More

- [Security Middleware Examples](docs/SECURITY_MIDDLEWARE.md)
- [Security Architecture](#security-architecture)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)

---

## Client SDK

```typescript
// Core client (framework agnostic, proxy-based)
import { createPayClient } from "@betterpay/client";
const client = createPayClient({ baseURL: "/pay" });

// Proxy dispatches unknown methods to /api/kebab-case
await client.createTransaction({ orderId: "order_1", amount: 199000, customerEmail: "a@b.com" });
await client.status({ orderId: "order_1" });
```

> **Planned (v2):** `@betterpay/client-react` (React hooks), `@betterpay/client-vue` (Vue composables)

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

## UI Package (Planned v2)

```tsx
// @betterpay/ui — planned, build your own for now
// Will include: PricingTable, BillingPortal, CheckoutForm, InvoiceList
```

---

## Complete Database Schema

```sql
-- ═══ Implemented in @betterpay/drizzle-adapter ═══

-- Core billing tables (prefix: betterpay_)
betterpay_customer              -- Customer data + phone
betterpay_product               -- Plan definitions (versioned, with hash)
betterpay_feature               -- Feature definitions (boolean/metered)
betterpay_product_feature       -- Plan ↔ Feature mapping (join)
betterpay_subscription          -- Subscription lifecycle (5 states)
betterpay_entitlement           -- Feature balance tracking (lazy reset)
betterpay_invoice               -- Invoice records

-- Payment infra tables (prefix: payment_)
payment_transaction             -- Materialized payment state
payment_event                   -- Append-only audit log
payment_webhook_event           -- Webhook dedup + signature audit
payment_idempotency_key         -- Prevents duplicate creation

-- ═══ Planned (v2) ═══
-- payment_reconciliation_job   -- Scheduled provider polls
-- payment_gateway_config       -- Encrypted credentials per provider
-- betterpay_product_provider   -- Plan ↔ Provider product mapping
-- betterpay_notification_log   -- (@betterpay/notification-*)
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
│  Providers:     Midtrans + Xendit + Duitku + Pakasir + Tripay│
│                 (5 provider adapters, all with tests)        │
│  Reliability:   Circuit breaker, retry, replay protection,  │
│                 reconciliation, idempotency, state machine   │
│  Framework:     Agnostic (Next/Hono/Express/Fastify/Bun/CF) │
│  UI:            Planned v2 (@betterpay/ui or build your own)│
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
│    ❌ Pakasir project slug verification                      │
│    ❌ Tripay HMAC-SHA256 signature scheme                    │
│    ❌ How webhooks differ between providers                  │
│    ❌ How to normalize different payment formats             │
│    ❌ Circuit breaker / retry / timeout logic                │
│                                                              │
│  That's the point.                                          │
└─────────────────────────────────────────────────────────────┘
```

---

*Architecture v5.0 — All 15 design decisions locked, docs synced with implementation*
*Patterns from: Better Auth (architecture) × PayKit (domain) × wabase (payment infra)*
*Last updated: 2026-06-13*
*See: docs/DESIGN_DECISIONS.md for full decision log with evidence*
