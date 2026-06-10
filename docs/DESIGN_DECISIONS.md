# BetterPay Design Decisions

> Hasil grilling session — 15 pertanyaan arsitektural yang dijawab dengan research-backed evidence.
> Setiap keputusan dicatat: konteks, opsi yang dipertimbangkan, keputusan final, dan alasannya.

---

## Daftar Keputusan

| # | Topik | Keputusan | Date |
|---|-------|-----------|------|
| 1 | [Scope](#1-scope) | Framework/Library (embedded) | 2026-06-10 |
| 2 | [Billing Cycle Ownership](#2-billing-cycle-ownership) | BetterPay-managed (primary), provider-native (optimization) | 2026-06-10 |
| 3 | [Provider Selection](#3-provider-selection) | Priority-based + circuit breaker fallback | 2026-06-10 |
| 4 | [Billing Cycle Trigger](#4-billing-cycle-trigger) | Cron template via CLI + runBillingCycle() endpoint | 2026-06-10 |
| 5 | [Checkout Experience](#5-checkout-experience) | API-only — provider serves checkout UI | 2026-06-10 |
| 6 | [Database Migrations](#6-database-migrations) | Auto in dev, block in prod, CLI push | 2026-06-10 |
| 7 | [Notifications](#7-notifications) | Plugin-based — core fires events, plugins send | 2026-06-10 |
| 8 | [Client SDK](#8-client-sdk) | Proxy with type inference (PayKit style) | 2026-06-10 |
| 9 | [Payment-to-Subscription Matching](#9-payment-to-subscription-matching) | Transaction record in DB as source of truth | 2026-06-10 |
| 10 | [Build Strategy](#10-build-strategy) | Extract providers from wabase, rewrite everything else | 2026-06-10 |
| 11 | [Testing Strategy](#11-testing-strategy) | Full pyramid + test clock for time simulation | 2026-06-10 |
| 12 | [One-Time vs Subscriptions](#12-one-time-vs-subscriptions) | Layered — core = one-time, billing = opt-in plugin | 2026-06-10 |
| 13 | [Multi-Tenancy](#13-multi-tenancy) | Single merchant | 2026-06-10 |
| 14 | [Refunds](#14-refunds) | Deferred to v2 | 2026-06-10 |
| 15 | [MVP Scope](#15-mvp-scope) | Phase 1: one-time + 2 providers, Phase 2: billing, Phase 3: polish | 2026-06-10 |

---

## 1. Scope

**Keputusan:** Framework/Library — developer install `@betterpay/core` dan embed di app mereka.

**Konteks:** BetterPay bisa jadi framework (kayak Better Auth) atau standalone service (kayak Stripe).

**Opsi yang dipertimbangkan:**
- A) Framework/Library — developer `npm install`, define plans di code, manage DB sendiri
- B) Standalone Service — developer call BetterPay API via HTTP, BetterPay manage DB
- C) Hybrid — core library + optional hosted dashboard

**Keputusan:** Option A.

**Alasan:**
1. Better Auth dan PayKit pakai model yang sama — proven
2. User owns their billing data (tidak locked di platform kita)
3. Lower operational burden (no hosting infra)
4. Developer Indonesia familiar dengan "install package + configure"
5. Sesuai north star: "user adaptasi sistem pembayaran dengan mudah"

**Trade-off:** User harus handle DB migrations dan deployment sendiri.

---

## 2. Billing Cycle Ownership

**Keputusan:** BetterPay manages billing cycle (primary path). Provider-native subscription API used as optimization where available.

**Konteks:** Research menunjukkan bahwa native subscription API di Indonesia sangat terbatas.

### Evidence (Exa Deep Research, June 2026)

**Virtual Account: TIDAK bisa auto-debit.**
- BCA VA = nomor rekening virtual untuk MENERIMA dana. Customer harus manual bayar setiap kali.
- BRI BRIVA = push payment only. Tidak bisa di-pull otomatis.
- BNI VA = identification number untuk incoming transfer. No pull capability.
- Mandiri VA Collection = biller generates bill, customer actively pays.
- CIMB/Permata/BSI = same story. VA = one-way push.

**E-Wallet: Bisa, tapi terbatas.**
- GoPay via Midtrans: Butuh account linking + No PIN flow, harus di-activate Midtrans team. Token bisa expire.
- OVO/DANA/ShopeePay via Xendit: Tokenization available tapi customer harus re-authorize kalau expire.

**QRIS: TIDAK bisa subscription.** Setiap transaksi butuh customer action (scan QR).

**Credit Card: Bisa, tapi butuh prasyarat berat.**
- Midtrans: Butuh special recurring MID dari acquiring bank + additional business agreement.
- Xendit: Butuh PCI-DSS Level 1 + approval dari risk team. Fee tambahan 0.5%.

**Retail (Indomaret/Alfamart): TIDAK bisa.** Customer harus datang ke toko.

**Direct Debit (Ayoconnect): Bisa tapi rumit.**
- Customer harus bind bank account (binding expire: Mandiri 3 bulan tanpa aktivitas)
- Separate integration (bukan via Midtrans/Xendit)
- Complex per-bank rules

### Realita Pasar Indonesia

```
✅ BISA auto-debit (true recurring):
├── Credit Card (tokenization + PCI-DSS + bank approval)
├── GoPay (tokenization + No PIN + Midtrans activation)
├── Direct Debit (Ayoconnect, separate integration)
└── That's it. ~5-10% of Indonesian payments.

❌ TIDAK bisa auto-debit (manual each cycle):
├── Virtual Account (~60-70% of payments)
├── QRIS (~15-20% of payments)
├── E-Wallet tanpa tokenization
├── Retail (Indomaret, Alfamart)
└── ~80-90% of Indonesian payments.
```

**Keputusan:** BetterPay manages billing cycle. Setiap cycle:
1. Generate payment link via provider
2. Kirim invoice notification (email + WhatsApp)
3. Customer bayar manual (VA/QRIS/e-wallet)
4. Provider webhook → BetterPay update subscription
5. Kalau belum bayar → dunning → suspend → cancel

Provider-native subscription API (Xendit/Midtrans) dipakai sebagai **optimization** untuk CC/GoPay users yang bisa true recurring.

**Midtrans Subscription API:** `POST /v1/subscriptions` — supports credit_card + gopay. Requires special recurring MID from acquiring bank.

**Xendit Subscription:** Payment Session `type: SUBSCRIPTION` — full auto-billing + retries + dunning + usage-based. Production-ready.

---

## 3. Provider Selection

**Keputusan:** Priority-based auto-fallback with circuit breaker.

**Konteks:** Saat user plug in multiple providers, siapa yang handle transaksi?

**Opsi yang dipertimbangkan:**
- A) User explicitly chooses providerId di setiap call
- B) Customer chooses di checkout page
- C) Smart auto-route (BetterPay decides based on rules)
- D) Developer sets priority, BetterPay auto-fallback

**Keputusan:** Option D.

**Alasan:**
1. Circuit breaker sudah ada di wabase code — tinggal leverage
2. Developer bisa set priority sesuai preferensi (fee, settlement speed)
3. Auto-fallback = resilience tanpa developer mikir
4. Override tetap available (developer bisa pass `providerId` explicit)

**Flow:**
```
subscribe({ planId: "pro" })
  │
  ├─ paymentMethod specified? (e.g. "qris")
  │   YES → find providers that support it, sort by priority
  │   NO  → use default (highest priority provider)
  │
  ├─ selected provider circuit breaker closed?
  │   YES → use it
  │   NO  → try next priority provider
  │
  ├─ all providers open?
  │   → return error "all providers unavailable"
  │
  └─ return payment link from selected provider
```

**Configuration:**
```typescript
plugins: [
  midtrans({ serverKey: "...", priority: 1 }),
  xendit({ apiKey: "...", priority: 2 }),
  duitku({ apiKey: "...", merchantCode: "...", priority: 3 }),
]
```

---

## 4. Billing Cycle Trigger

**Keputusan:** Cron template via CLI + `runBillingCycle()` function + dedicated cron endpoint.

**Konteks:** BetterPay adalah library (bukan service), jadi tidak ada "BetterPay server" yang jalan 24/7. Siapa yang bangunin billing cycle setiap bulan?

**Opsi yang dipertimbangkan:**
- A) User setup cron sendiri (BetterPay provide function)
- B) Built-in scheduler (setInterval di library)
- C) Lazy evaluation (check on every request)
- D) Hybrid — provide function + cron template + framework-specific setup

**Keputusan:** Option D.

**Alasan:**
1. Serverless is dominant di Indonesia (Vercel, Cloudflare, Railway)
2. `setInterval` di library = anti-pattern untuk production
3. Lazy evaluation unreliable untuk billing (money is at stake)
4. Cron template via CLI solves the "user forgets to setup" problem

**Implementation:**
```typescript
// BetterPay provides:
export async function runBillingCycle(pay: PayInstance) { ... }

// CLI generates framework-specific cron config:
// "betterpay init" detects framework and generates:

// Cloudflare Workers (wrangler.toml):
// [triggers]
// crons = ["0 * * * *"]

// Vercel (vercel.json):
// { "crons": [{ "path": "/api/betterpay/cron", "schedule": "0 * * * *" }] }

// Node.js (node-cron):
// cron.schedule("0 * * * *", () => pay.runBillingCycle());

// Dedicated endpoint:
// POST /pay/api/cron (protected by CRON_SECRET)
```

---

## 5. Checkout Experience

**Keputusan:** API-only — provider serves checkout UI. BetterPay returns payment URL/token.

**Konteks:** Dimana customer actually membayar?

### Evidence (Exa Deep Research, June 2026)

**Midtrans Snap SUDAH provide full checkout UI:**
- **Popup mode:** `window.snap.pay(token)` — overlay di atas halaman app
- **Embedded mode:** `window.snap.embed(token, { embedId: 'container' })` — embedded langsung
- **Redirect mode:** `window.location.href = redirect_url` — redirect ke hosted page
- Customizable: logo, warna, bahasa
- Includes: semua payment methods (VA, QRIS, e-wallet, CC, retail, paylater)

**Xendit Payment Sessions SUDAH provide checkout UI:**
- **PAYMENT_LINK mode:** Redirect ke Xendit-hosted checkout page
- **COMPONENTS mode:** Embed Xendit SDK di halaman developer (PCI-compliant fields)

**Indonesian SaaS companies build their own + redirect:**
- Ruangguru: Custom UI → pilih metode → redirect ke payment gateway
- Mekari Jurnal: Custom pricing page → hubungi sales → bank transfer/CC
- Niagahoster: Custom checkout → pilih method → redirect

**Pattern universal:**
```
App's own UI (pricing page, plan selection)
  → Show payment method options (custom UI)
  → User picks method
  → Redirect to provider's hosted checkout page
  → User pays on provider's page
  → Redirect back to app's success URL
  → Webhook confirms payment
```

**Keputusan:** BetterPay TIDAK serve HTML. TIDAK render UI. Pure API.

```typescript
const result = await pay.subscribe({ planId: "pro", customerId: "user_123" });
// result = {
//   paymentUrl: "https://app.midtrans.com/snap/v2/xxx",  // redirect
//   snapToken: "xxx-xxx-xxx",                              // popup/embed
//   qrString: "00020101...",                               // QRIS
//   vaNumber: "1234567890",                                // VA
// }
```

`@betterpay/ui` (Phase 3) = billing portal + pricing table, BUKAN checkout page.

---

## 6. Database Migrations

**Keputusan:** Auto-migrate in development, block in production, CLI for explicit control.

**Opsi yang dipertimbangkan:**
- A) Auto-migrate on startup (convenient but dangerous)
- B) CLI-only (safe but easy to forget)
- C) User's migration tool (Drizzle/Prisma — complex)
- D) Hybrid — auto in dev, block in prod, CLI for explicit

**Keputusan:** Option D.

**Alasan:**
1. PayKit already proves this pattern works
2. Production safety non-negotiable — auto-migrating production DB during rolling deployment = data corruption
3. Dev convenience matters — nobody wants to run CLI every time they add a plan

**Flow:**
```
DEVELOPMENT:
  App starts → check migrations → auto-apply → check product sync → warn
  
PRODUCTION:
  Deploy script: npx @betterpay push → apply migrations + sync products
  
PRODUCTION (without CI/CD step):
  App starts → "3 pending migrations!" → process.exit(1) → operator fixes
```

---

## 7. Notifications

**Keputusan:** Plugin-based. Core fires events, plugins handle sending. Dunning schedule stays in core.

**Opsi yang dipertimbangkan:**
- A) Built-in (BetterPay sends email/WA directly)
- B) Event hooks (developer handles everything)
- C) Plugin-based (core fires events, plugins send)

**Keputusan:** Option C.

**Alasan:**
1. Better Auth pattern — core fires events, plugins handle side effects
2. Notification bukan billing — separation of concerns
3. Dunning schedule = billing logic (when to send, stays in core)

**Events fired by core:**
```
invoice.created       → "Tagihan Rp 199K sudah siap"
invoice.overdue       → "Bayar sebelum tanggal X" (D+3, D+5, D+7)
payment.succeeded     → "Pembayaran berhasil"
subscription.suspended → "Subscription di-suspend"
subscription.expired  → "Subscription berakhir"
```

**Dunning schedule (in core, configurable):**
```typescript
dunning: {
  reminders: [3, 5, 7],   // days after due date
  suspendAfter: 10,        // days after due date
  expireAfter: 14,         // days after due date
}
```

**Plugin packages:**
- `@betterpay/notification-email` — Resend, SendGrid, SMTP
- `@betterpay/notification-whatsapp` — Fonnte, Wablas, Twilio
- `@betterpay/notification-sms` — Twilio, local SMS gateway

---

## 8. Client SDK

**Keputusan:** Proxy-based with type inference from server instance (PayKit style).

**Opsi yang dipertimbangkan:**
- A) Dynamic proxy (PayKit style) — `payClient.subscribe()` auto-maps to endpoint
- B) Explicit typed methods (Better Auth style) — requires importing plugins
- C) Proxy + explicit hybrid

**Keputusan:** Option A.

**Alasan:**
1. PayKit's proxy approach works — ~40 lines, zero dependencies
2. Type inference dari server instance = autocomplete without manual imports
3. Plugin endpoints auto-available tanpa explicit registration
4. Framework-agnostic — just fetch

**Method → Path mapping:**
```typescript
payClient.getCustomer({ id: "123" })     → POST /pay/api/get-customer
payClient.subscribe({ planId: "pro" })   → POST /pay/api/subscribe
payClient.midtrans.getStatus({ ... })    → POST /pay/api/midtrans/get-status
```

---

## 9. Payment-to-Subscription Matching

**Keputusan:** Transaction record in DB as source of truth.

**Konteks:** Saat webhook masuk, gimana BetterPay tahu payment ini untuk subscription mana?

**Opsi yang dipertimbangkan:**
- A) Order ID encoding — embed subscription info in orderId string
- B) Metadata passthrough — pass subscription info in provider metadata
- C) Transaction record lookup — DB record links orderId to subscriptionId
- D) Hybrid (C + B as backup)

**Keputusan:** Option C.

**Alasan:**
1. This is EXACTLY what wabase's `payment_transaction` table does — production-proven
2. Provider-agnostic — works even if provider strips custom metadata
3. Database is source of truth — not dependent on provider payload
4. Audit trail — every payment linked to subscription

**Flow:**
```
Billing cycle:
  1. Create payment_transaction record (orderId, subscriptionId, cycleNumber)
  2. Call provider.createTransaction(orderId)
  3. Store providerTransactionId

Webhook arrives:
  4. Extract orderId from webhook payload
  5. Look up payment_transaction by orderId
  6. Read subscriptionId from record
  7. Update subscription + entitlements

OrderId generation:
  generateOrderId() → "bp_" + randomBase62(12)  // 15 chars, under 50 char limit
```

---

## 10. Build Strategy

**Keputusan:** Extract provider adapters from wabase, rewrite everything else.

**Konteks:** Ada production code di `@repo/payment-gateway` (wabase) dengan 4 working provider adapters.

**Opsi yang dipertimbangkan:**
- A) Extract & wrap — take wabase code as-is, restructure
- B) Rewrite from scratch — ignore wabase code
- C) Hybrid — extract providers, rewrite everything else

**Keputusan:** Option C.

**What to extract (keep — battle-tested):**
```
✅ MidtransAdapter: Snap API, Basic auth, SHA512 signature, status mapping
✅ XenditAdapter: Payment Sessions, Basic auth, token comparison, status mapping
✅ DuitkuAdapter: Merchant API, MD5 signature, SHA256 webhook, status mapping
✅ PakasirAdapter: Transaction API, project slug match, status mapping
✅ Circuit breaker implementation
✅ Retry with exponential backoff + jitter
✅ Replay protection timestamp validation
✅ Idempotency key computation
✅ Crypto helpers (AES-GCM, HMAC, constant-time compare)
✅ Signature helpers (SHA256, SHA512)
```

**What to rewrite:**
```
❌ PaymentGateway class → better-call router + plugin system
❌ BasePaymentProvider class → function-based PaymentProvider interface
❌ DrizzlePaymentRepository → adapter factory pattern
❌ Webhook handler → PayKit-style idempotency pipeline
❌ Factory → BetterPay plugin system
❌ Schema → New schema (betterpay_ prefix, provider mapping tables)
❌ Workers → Cron endpoint + reconciliation plugin
```

**Conversion pattern (class → function):**
```typescript
// FROM (wabase class):
class MidtransAdapter extends BasePaymentProvider {
  async createTransaction(params) { ... }
}

// TO (BetterPay function):
export const midtransProvider = (config): PaymentProvider => ({
  id: "midtrans",
  createPaymentLink: async (data) => { /* same logic */ },
  verifyWebhook: async (data) => { /* same logic */ },
  normalizeWebhook: async (data) => { /* same logic */ },
});
```

---

## 11. Testing Strategy

**Keputusan:** Full pyramid — unit + mock provider + test clock + E2E sandbox.

**Opsi yang dipertimbangkan:**
- A) Unit tests only
- B) Unit + integration with mock provider
- C) Unit + mock + real sandbox E2E
- D) Full pyramid + test clock for time simulation

**Keputusan:** Option D.

**Alasan:**
1. Subscription billing NEEDS time simulation — can't test "30 days later" without it
2. PayKit already has this pattern (`testing: { enabled: true }`)
3. E2E with real sandbox catches integration bugs
4. Env-gated = safe for CI

**Test pyramid:**
```
Level 4: E2E (real sandbox, env-gated)
  ├── Midtrans: create payment → webhook → subscription activated
  ├── Xendit: payment session → completion → entitlement granted
  └── Skip in CI without MIDTRANS_SANDBOX_KEY / XENDIT_API_KEY

Level 3: Time Simulation (test clock)
  ├── Subscription renewal after 30 days
  ├── Dunning: overdue → reminder → suspend → expire
  └── Entitlement reset after 1 month

Level 2: Integration (mock provider, in-memory DB)
  ├── Full subscription flow
  ├── Webhook processing
  ├── Circuit breaker behavior
  └── Reconciliation worker

Level 1: Unit (isolated functions)
  ├── State machine transitions
  ├── Signature verification (per provider)
  ├── Entitlement balance calculation (lazy reset, stacked CTE)
  ├── Plan hash computation
  ├── ID generation
  └── Amount validation (ISO 4217)
```

---

## 12. One-Time vs Subscriptions

**Keputusan:** Layered — core handles one-time payments, billing is an opt-in plugin.

**Opsi yang dipertimbangkan:**
- A) Unified API (Stripe-like — one API for everything)
- B) Completely separate packages
- C) Layered — core = one-time, billing = plugin on top

**Keputusan:** Option C.

**Alasan:**
1. 80% Indonesian businesses just need "accept payment" — not subscription management
2. wabase's primary use case is one-time payments (campaign management)
3. Progressive complexity — start simple, add billing when needed

**`@betterpay/core` provides (always available):**
```typescript
pay.createTransaction({ amount, orderId, provider? })
pay.checkStatus(transactionId)
pay.handleWebhook({ provider, body, headers })
pay.getTransaction(transactionId)
pay.listTransactions({ customerId, status, limit })
pay.reconcile(transactionId)
pay.cancel(transactionId)
```

**`@betterpay/billing` adds (opt-in plugin):**
```typescript
feature({ id: "messages", type: "metered" })
plan({ id: "pro", price: { amount: 199_000, interval: "month" } })

pay.subscribe({ planId, customerId })
pay.cancelSubscription({ customerId })
pay.check({ featureId, customerId })
pay.report({ featureId, customerId, amount })
pay.getInvoices({ customerId })
pay.runBillingCycle()
```

**Usage:**
```typescript
// Just one-time payments:
const pay = betterPay({
  plugins: [midtrans({ ... })],
});

// Add billing:
const pay = betterPay({
  plugins: [
    midtrans({ ... }),
    billing({ products: [free, pro, enterprise] }),
  ],
});
```

---

## 13. Multi-Tenancy

**Keputusan:** Single merchant.

**Opsi yang dipertimbangkan:**
- A) Single merchant only
- B) Multi-org from day 1 (with organizationId)
- C) Single merchant (v1) + multi-org plugin (v2)

**Keputusan:** Option A.

**Alasan:**
1. BetterPay is a framework — multi-tenancy is the USER's responsibility
2. Customer metadata already solves 80% of multi-tenant needs:
   ```typescript
   await pay.subscribe({
     planId: "pro",
     customerId: "user_123",
     metadata: { orgId: "org_abc", tenantSlug: "acme-corp" },
   });
   ```
3. PayKit is single-merchant. Better Auth is single-tenant.
4. Schema stays clean — no `organization_id` everywhere
5. Multi-org/platform (Xendit xenPlatform, split payment) = separate product scope

---

## 14. Refunds

**Keputusan:** Deferred to v2.

**Rationale:** Refund is complex (VA/QRIS cannot be refunded via API, partial refund math, subscription entitlement implications). Not blocking for MVP.

**v2 design (captured for reference):**

Smart refund with method-aware logic:
- CC/e-wallet → call provider refund API → status: "refunded"
- VA/QRIS/retail → mark as "refund_requested" → developer processes manually
- Subscription + full refund → revoke entitlements, downgrade to free

State machine addition:
```
completed → refunded (automatic via API)
completed → refund_requested (manual process pending)
```

---

## 15. MVP Scope

**Keputusan:** Three phases — one-time payments first, then billing, then polish.

### Phase 1 — MVP (Target: 4 weeks)

**Goal:** Developer bisa `npm install`, setup 30 menit, terima pembayaran via Midtrans/Xendit.

```
@betterpay/core
├── better-call router + plugin system
├── Provider interface + registry + priority + circuit breaker
├── Transaction record + webhook pipeline
├── One-time payment: createTransaction, handleWebhook, getStatus
├── Auto-migrate (dev) + block (prod)
└── Framework handler: Next.js + Hono

@betterpay/midtrans  (extracted from wabase)
@betterpay/xendit    (extracted from wabase)
@betterpay/client    (proxy SDK, core only)
@betterpay/cli       (init + push + status)
```

**Validation criteria:**
- [ ] Developer can `npm install @betterpay/core @betterpay/midtrans`
- [ ] `betterpay init` detects framework, generates config + route handler
- [ ] `betterpay push` applies migrations
- [ ] `pay.createTransaction()` returns Midtrans payment URL
- [ ] Midtrans webhook → transaction status updated in DB
- [ ] `pay.getStatus()` returns correct status
- [ ] Circuit breaker opens after 5 failures

### Phase 2 — Billing (Target: 3 weeks)

**Goal:** Full subscription management with entitlements.

```
@betterpay/billing (plugin)
├── Plan/Feature DSL (feature(), plan())
├── Subscription state machine
├── Entitlement engine (check + report, lazy reset, stacked CTE)
├── Billing cycle (runBillingCycle)
├── Cron endpoint + template generation
├── Invoice generation
└── Dunning scheduler

@betterpay/duitku   (extracted from wabase)
@betterpay/pakasir  (extracted from wabase)
@betterpay/notification-email
Testing: test clock + mock provider
```

### Phase 3 — Polish (Target: 3 weeks)

**Goal:** Production-ready with rich ecosystem.

```
@betterpay/client-react (hooks: useSubscription, useEntitlement, useInvoices)
@betterpay/ui (pricing table, billing portal, invoice list)
@betterpay/notification-whatsapp
Framework handlers: Express, Fastify, Bun, Cloudflare
E2E tests with real sandbox
Documentation site (Fumadocs)
Demo app
```

---

## Appendix: Research Data References

All research data is stored in:
- `/home/ujang/0new/devstack/betterpay/docs/provider-research-2026.md` — Pricing, API details, regulations, QRIS data
- `/home/ujang/0new/devstack/betterpay/docs/paykit-feature-mapping.md` — 182 PayKit features mapped to BetterPay
- `/home/ujang/0new/devstack/betterpay/COMPARISON.md` — Better Auth vs BetterPay architecture comparison
- `/home/ujang/0new/devstack/betterpay/ARCHITECTURE.md` — Definitive architecture document (v3.0)

### Key Data Points Referenced

**Provider Pricing (2026):**
- Midtrans: CC 2.9%+Rp2,000, VA Rp4,000, e-wallet 1.5-2%, QRIS 0.7%
- Xendit: CC 2.9%+Rp2,500, VA Rp4,000, e-wallet 1.5-2%, QRIS 0.7%, recurring +0.5%
- DOKU: Custom enterprise (20-40% lower for high volume)
- Duitku: E-wallet 1.67%, most VA banks

**BI Regulation PBI 10/2025 (effective March 31, 2026):**
- TIKMI assessment for all PSPs
- SNAP compliance mandatory
- Min capital IDR 15B
- Foreign ownership max 85% economic, 51% voting control Indonesian

**QRIS (June 2026):**
- MDR: 0% (UMI ≤Rp500K), 0.3% (UMI >Rp500K), 0.7% (others)
- 63M users, 45.3M merchants, 7.83B transactions (through April 2026)
- Cross-border: 6 countries live (TH, MY, SG, JP, KR, CN)
- Target 2026: 17B transactions, 8 countries, 70M users

---

*Document version: 1.0.0*
*Created: 2026-06-10*
*Based on: Grilling session with 15 architectural decisions*
*Research: Exa deep search (provider pricing, APIs, BI regulations, QRIS developments)*
*Codebase references: wabase payment-gateway (production), PayKit v0.0.6, Better Auth v1.6.15*
