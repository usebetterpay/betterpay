# BetterPay Post-Audit Improvement Roadmap

> **For agentic workers:** Execute phases in order. Later phases assume earlier gates pass. Use `subagent-driven-development` or `executing-plans` per phase. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Close the gap between marketing claims and production-safe behavior so BetterPay is an honest, shippable Indonesian payment + billing library.

**Architecture:** Keep plugin-first monorepo. Prefer wiring existing half-built pieces (circuit breaker, drizzle repos, reconciliation) over new features. Default path for production must be durable (Postgres); in-memory stays dev/test only.

**Tech Stack:** TypeScript, pnpm workspaces, turbo, vitest, better-call, drizzle-orm, PostgreSQL.

**Source of truth for urgency:** Brutal system audit (2026-07-15) against this repo.

**Verification baseline (run from repo root):**

```bash
pnpm install
pnpm test --run
pnpm typecheck
pnpm lint
```

**Success definition for this roadmap:** A developer can create a payment, receive a webhook, restart the process, and still see correct durable state — without reading marketing fiction.

---

## Urgency map (read this first)

| Priority | Phase | Why first |
|----------|-------|-----------|
| **P0 — STOP SHIP LIES** | 0 | Broken tests + false README claims destroy trust immediately |
| **P0 — MONEY SAFETY** | 1 | Webhooks/idempotency wrong = double fulfill or lost paid orders |
| **P0 — DURABILITY** | 2 | In-memory default = not a product for production |
| **P1 — RELIABILITY** | 3 | Circuit breaker/retry/reconciliation either real or deleted from docs |
| **P1 — BILLING COMPLETE** | 4 | Subscription engine without dunning wire-up is half a product |
| **P2 — HONEST SURFACE** | 5 | Stub plugins/CLI/docs that pretend to work |
| **P2 — DX CLEANUP** | 6 | Package sprawl, missing tests on drizzle |
| **P3 — GROWTH** | 7 | UI, multi-tenant, OJK — only after P0–P2 |

**Rule:** Do not start Phase 7 features until Phase 0–2 gates are green.

```
Phase 0  Integrity + honesty (1–2 days)
   ↓
Phase 1  Webhook & payment correctness (3–5 days)
   ↓
Phase 2  Durable persistence path (3–5 days)
   ↓
Phase 3  Reliability primitives wired or removed (2–4 days)
   ↓
Phase 4  Billing cycle + dunning wired (3–5 days)
   ↓
Phase 5  Kill theater / honest docs (1–2 days)
   ↓
Phase 6  DX + package hygiene (ongoing)
   ↓
Phase 7  Real product growth (later)
```

---

## Phase 0 — Integrity baseline (URGENT #1)

**Problem:** Integration suites fail (`zod` missing from `@betterpay/core`). Docs claim “443 tests” / “production-ready” while suite is broken and defaults are in-memory.

**Outcome:** `pnpm test --run` fully green; README/ARCHITECTURE stop claiming untrue reliability.

### Tasks

- [ ] **0.1** Add `zod` to `packages/core/package.json` `dependencies` (match version used elsewhere or pin a current major, e.g. `^3.24.0` or `^4` if already in lockfile — check monorepo first).
- [ ] **0.2** Run `pnpm install` from root; run `pnpm test --run` until **0 failed suites**.
- [ ] **0.3** Fix any residual import/resolution issues in:
  - `packages/core/__tests__/integration/billing-wiring.test.ts`
  - `packages/core/__tests__/integration/full-flow.test.ts`
- [ ] **0.4** README honesty pass (`README.md`):
  - Remove or rewrite: “automatic failover and circuit breaker” until Phase 3 lands.
  - Soften “never have to read another payment gateway docs” if not true.
  - Add **Status** line: e.g. `Alpha — production use requires Postgres adapter + durable webhook store (see Production checklist)`.
- [ ] **0.5** ARCHITECTURE honesty pass (`ARCHITECTURE.md`):
  - Replace “Production-ready. … 443 tests passing” with live numbers and “Alpha/Beta”.
  - Mark reconciliation, notification plugins, CLI push, database hooks as **not wired / stub** where true.
  - Fix drizzle usage example if `billing({ repos })` does not exist yet (or implement in Phase 2 and then update).
- [ ] **0.6** Add short `docs` or README section **Production checklist**:
  - Provide `transactionRepository` (drizzle)
  - Provide billing repos (after Phase 2)
  - Do not rely on process memory for webhooks
  - Prefer Midtrans/Xendit/Tripay over Mayar/Pakasir for crypto webhook verify
  - Set `BETTERPAY_MASTER_KEY` only if using credential store

### Gate

```bash
pnpm test --run   # 0 failed
pnpm typecheck
```

No remaining strings claiming “production-ready” without the checklist.

---

## Phase 1 — Payment & webhook correctness (URGENT #2)

**Problem:** Money path is the product. Webhook idempotency is an in-memory `Set`; replay protection is optional generic header; Mayar/Pakasir verification is forgeable field match.

**Outcome:** Duplicate webhooks and restarts do not corrupt payment status when durable store is configured.

### Key files today

| Area | Path |
|------|------|
| Webhook handler | `packages/core/src/webhook/handler.ts` |
| Replay protection | `packages/core/src/webhook/replay-protection.ts` |
| Transaction service | `packages/core/src/transaction/service.ts` |
| State machine | `packages/core/src/transaction/` (status transitions) |
| Mayar verify | `packages/mayar/src/signature.ts` |
| Pakasir verify | `packages/pakasir/src/signature.ts` |
| Drizzle tx repo | `packages/drizzle-adapter/src/repos/transaction.ts` |
| Schema | `packages/drizzle-adapter/src/schema.ts` |

### Tasks

- [ ] **1.1** Define `WebhookEventRepository` interface in core (record event id / provider / fingerprint; return `wasDuplicate`).
- [ ] **1.2** Implement in-memory repo for tests + drizzle repo against `payment_webhook_event` (or existing table names in schema).
- [ ] **1.3** Replace `processedEvents = new Set()` in `WebhookHandler` with injected repository.
- [ ] **1.4** Wire repository through `betterPay({ webhookEventRepository })` / drizzle `createDrizzleRepositories`.
- [ ] **1.5** Tests:
  - Same webhook twice → second is duplicate, status not double-applied.
  - Invalid signature → no status change.
  - Unknown orderId → controlled error.
  - Invalid state transition → error, no silent corrupt.
- [ ] **1.6** Per-provider timestamp/replay: document which providers send timestamps; only enforce when present; do not claim global replay protection.
- [ ] **1.7** Security docs for Mayar/Pakasir: require IP allowlist / secret header if available; mark adapters `capabilities.weakWebhookAuth: true` if interface allows; README warning.
- [ ] **1.8** Integration test: createTransaction → mock webhook → getStatus `completed` with **non-memory** repos if testcontainers available; otherwise interface-level test with fake durable repo that survives “new handler instance”.

### Gate

Webhook path has no process-local-only idempotency when a repository is provided. Tests prove duplicate handling across “restart” (new handler instance, same repo).

---

## Phase 2 — Durable default path for production (URGENT #3)

**Problem:** `billing()` always creates in-memory repos. Drizzle adapter exists but is not injectable into billing. Docs imply Postgres is ready.

**Outcome:** One documented, tested production bootstrap using drizzle for transactions + billing tables.

### Key files

| Area | Path |
|------|------|
| Billing plugin | `packages/billing/src/index.ts` |
| Billing options | `BillingPluginOptions` (extend) |
| Repo interfaces | `packages/billing/src/subscription/`, `entitlement/`, `customer/`, `invoice/` |
| In-memory | `packages/billing/src/in-memory-repos.ts` |
| Drizzle | `packages/drizzle-adapter/src/index.ts`, `repos/*` |
| Core factory | `packages/core/src/create-betterpay.ts` |
| Demo | `demo/index.ts` |

### Tasks

- [ ] **2.1** Extend `BillingPluginOptions`:

```ts
export interface BillingPluginOptions {
  products: PlanDefinition[];
  repositories?: {
    subscription: SubscriptionRepository;
    entitlement: EntitlementRepository;
    customer: CustomerRepository;
    invoice: InvoiceRepository;
  };
}
```

- [ ] **2.2** If `repositories` omitted → in-memory (dev). If provided → use them. No silent mix.
- [ ] **2.3** Align drizzle repo method signatures with billing service interfaces (fix adapter or billing interfaces — pick one source of truth; prefer billing interfaces as contract).
- [ ] **2.4** Update `createDrizzleRepositories` JSDoc example to match real API.
- [ ] **2.5** Optional: `betterPay({ database, adapter: 'drizzle' })` auto-wire later — **not required** if explicit inject is clear.
- [ ] **2.6** Add `@betterpay/drizzle-adapter` tests (even with mocked drizzle `db` or pg-mem / testcontainers).
- [ ] **2.7** Demo or `docs/quickstart` production snippet:

```ts
const repos = createDrizzleRepositories(db);
const pay = betterPay({
  transactionRepository: repos.transaction,
  plugins: [
    midtrans({ ... }),
    billing({ products: [...], repositories: {
      subscription: repos.subscription,
      entitlement: repos.entitlement,
      customer: repos.customer,
      invoice: repos.invoice,
    }}),
  ],
});
```

- [ ] **2.8** Log warning at startup if billing uses in-memory and `NODE_ENV === 'production'`.

### Gate

Documented path persists subscriptions/entitlements/transactions across process restart (manual or automated test).

---

## Phase 3 — Reliability: wire or delete (URGENT #4)

**Problem:** Circuit breaker and `withRetry` exist and are tested in isolation but **never called** from `createTransaction`. Registry priority is not failover. Reconciliation worker returns `[]` TODOs.

**Outcome:** Either real multi-provider resilience or zero marketing about it.

### Key files

| Area | Path |
|------|------|
| createTransaction | `packages/core/src/create-betterpay.ts` (~409–456) |
| Router create path | `packages/core/src/router.ts` |
| Circuit breaker | `packages/core/src/utils/circuit-breaker.ts` |
| Retry | `packages/core/src/utils/retry.ts` |
| Registry | `packages/core/src/provider/registry.ts` |
| Reconciliation | `packages/core/src/reconciliation/reconciliation-worker.ts` |
| Provider `checkStatus` | each `packages/*/src/adapter.ts` |

### Tasks

- [x] **3.1** Wrap `provider.createPaymentLink` in `withRetry` + per-provider `CircuitBreaker` map inside factory (not only export utilities).
- [x] **3.2** Define failover policy (minimal v1):
  - On retryable provider error after N attempts, try next provider by priority **only if** `failover: true` in options (default **false** to avoid surprising double charges).
  - Document: failover only for **create link** failures before customer pays — never for ambiguous mid-payment states.
- [x] **3.3** Rename docs: “priority-based default selection” vs “automatic failover”.
- [x] **3.4** Reconciliation v1:
  - Inject real `getPendingTransactions` from transaction repo (status pending/active, age window).
  - Map provider adapters: `checkStatus` → worker’s `getTransactionStatus`.
  - Remove empty `new Map()` + TODO stubs when `reconciliation.enabled`.
  - Prefer **external cron hitting `/reconcile`** over in-process `setInterval` for serverless; document both.
- [x] **3.5** Tests: breaker opens after failures; retry counts; reconcile updates stale pending when provider says paid.
- [x] **3.6** If timeboxed: **delete** unused reconciliation from public API rather than shipping stubs.

### Gate

`rg "createCircuitBreaker|withRetry" packages/core/src/create-betterpay.ts packages/core/src/router.ts` finds real usage. README failover text matches code.

---

## Phase 4 — Billing lifecycle completion (URGENT #5)

**Problem:** Subscription + entitlement logic is the best non-adapter code, but dunning is disconnected, billing cycle runner may stay uninitialized, notifications are empty packages.

**Outcome:** Paid plan renew / fail path is executable with cron + optional hooks.

### Key files

| Area | Path |
|------|------|
| Billing cycle | `packages/billing/src/billing-cycle/runner.ts` |
| Dunning | `packages/billing/src/dunning/dunning-manager.ts` |
| Cron | `packages/billing/src/cron/cron-endpoint.ts` |
| Core billing API | `packages/core/src/create-betterpay.ts` `createBillingAPI` |
| Notifications | `packages/notification-email`, `notification-whatsapp` |

### Tasks

- [x] **4.1** Ensure core factory always initializes `BillingCycleRunner` with provider + invoice + subscription deps when billing plugin present (`__wireBillingCycle` path).
- [x] **4.2** Wire payment-failure → multi-stage `DunningService` (retry → suspend → expire) on create-link failure during cycle.
- [x] **4.3** Define `NotificationChannel` interface on plugin; fire events: `invoice.created`, `payment.failed`, `subscription.canceled`.
- [x] **4.4** Real channels: email via Resend + WhatsApp via Fonnte.
- [x] **4.5** Integration test: wire runner → renew success / renew failure → past_due.
- [x] **4.6** Document required cron: `POST /reconcile` + `runBillingCycle` schedule for ID (no auto-debit).

### Gate

Test clock scenario covers renew success and renew failure → past_due without manual service calls outside public API.

---

## Phase 5 — Kill feature theater (URGENT #6)

**Problem:** CLI `push` prints success-shaped output without migrations. Plugin hooks in interface never merged. Huge ARCHITECTURE security essay overstates built-ins.

### Key files

| Area | Path |
|------|------|
| CLI push | `packages/cli/src/commands/push.ts` |
| Plugin type | `packages/core/src/plugin.ts` |
| Factory | `packages/core/src/create-betterpay.ts` |
| ARCHITECTURE | `ARCHITECTURE.md` |

### Tasks

- [x] **5.1** CLI `push`: applies SQL migrations via `MigrationRunner` + `@betterpay/drizzle-adapter/migrations` (product sync still deferred; no fake success).
- [x] **5.2** Plugin hooks: merge `endpoints` + `onRequest`/`onResponse`; deprecate unwired `hooks`/`middlewares`.
- [x] **5.3** Remove “transaction-aware hook queue” / “database hooks” from ARCHITECTURE if code search finds no implementation.
- [x] **5.4** Collapse planned packages list; stop listing OJK/UI as if near-term without owners.

### Gate

No CLI command implies success for unimplemented work. Grep for documented features that have zero call sites returns empty (or docs mark “planned”).

---

## Phase 6 — DX & hygiene (after P0–P2)

**Outcome:** Smaller surface, higher confidence per package.

### Tasks

- [x] **6.1** Consider merging HTTP adapters — deferred (optional DX; separate packages stay for tree-shake clarity).
- [x] **6.2** Ensure every package with logic has `__tests__` (drizzle-adapter + notification-email + notifications core).
- [x] **6.3** CI workflow: `pnpm test --run` + `pnpm typecheck` on PR; fail on missing deps.
- [x] **6.4** npm publish checklist: only publish packages that are not stubs (`docs/PUBLISH.md`).
- [x] **6.5** Client SDK: typed methods for real endpoints only; no infinite proxy.

---

## Phase 7 — Growth (do not start early)

Only after Phase 0–2 gates:

| Idea | When it becomes worth it |
|------|---------------------------|
| `@betterpay/ui` pricing table | After durable billing + one real app dogfood |
| Refunds v2 | When Midtrans/Xendit refund APIs needed by users |
| Multi-tenancy | When hosting BetterPay as SaaS (explicitly deferred in ARCHITECTURE) |
| OJK compliance package | Legal/product owner + real requirements — not a folder name |
| Fastify handler | One user request |
| client-react hooks | After HTTP API stable |

---

## Suggested calendar (solo / small team)

| Week | Focus |
|------|--------|
| **Week 1** | Phase 0 + Phase 1 (honesty + webhooks) |
| **Week 2** | Phase 2 (drizzle billing wire-up) |
| **Week 3** | Phase 3 (retry/breaker/reconcile) |
| **Week 4** | Phase 4 + 5 (billing complete + kill theater) |
| **Ongoing** | Phase 6 |

If only **3 days** available, do **only**:

1. Phase 0 (zod + honest README)
2. Phase 1.1–1.5 (durable webhook idempotency)
3. Phase 2.1–2.2 + 2.7 (injectable billing repos + doc)

That trio maximizes credibility and money safety per hour.

---

## What NOT to do next

- Do not add more provider packages before webhook durability.
- Do not build dashboards/UI.
- Do not add AI/analytics/recommendation features.
- Do not expand ARCHITECTURE with new pillars.
- Do not claim failover in README before Phase 3.
- Do not implement second notification channel before first sends a real message.

---

## Per-phase commit style (for executors)

- One phase ≈ one PR (or stacked PRs per task group).
- Commit messages: focus on why (e.g. `fix: persist webhook idempotency so restarts cannot double-apply payments`).
- Every PR must show `pnpm test --run` output in description.

---

## Traceability (audit → phase)

| Audit finding | Phase |
|---------------|--------|
| zod missing / tests fail / “443 tests” | 0 |
| production-ready claim | 0, 2 |
| Webhook Set idempotency | 1 |
| Mayar/Pakasir weak verify | 1 |
| billing always in-memory / drizzle not injectable | 2 |
| circuit breaker not wired | 3 |
| reconciliation TODO | 3 |
| failover marketing false | 0, 3 |
| dunning unwired | 4 |
| notification stubs | 4, 5 |
| CLI push theater | 5 |
| plugin hooks not merged | 5 |
| framework package sprawl | 6 |

---

## Final priority answer (one paragraph)

**Paling urgent:** (1) perbaiki integrity test + hentikan klaim bohong, (2) webhook/idempotency yang tahan restart, (3) path Postgres nyata untuk transaksi + billing. Baru setelah itu worth mengutak-atik circuit breaker, reconciliation, dunning, dan notifikasi. Fitur pertumbuhan (UI, OJK, multi-tenant) adalah prioritas terakhir — menambahnya sekarang hanya memperbesar bullshit score.
