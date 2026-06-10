# BetterPay — Research & Architecture Summary

> Executive summary of the complete research, architecture design, and decision-making process for BetterPay — an Indonesian billing framework.
> 
> **Date:** 2026-06-10
> **Status:** Architecture complete. All 15 design decisions locked. Ready for implementation.

---

## What We Built

Sebuah **complete architectural blueprint** untuk BetterPay — billing framework yang menyatukan payment gateway Indonesia (Midtrans, Xendit, DOKU, Duitku, Pakasir) di bawah satu API, dengan subscription management, entitlement tracking, dan webhook reconciliation.

**Bukan code.** Ini adalah **research + architecture documentation** yang siap diimplementasi.

---

## Deliverables

| # | File | Lines | Description |
|---|------|:-----:|-------------|
| 1 | **[ARCHITECTURE.md](../ARCHITECTURE.md)** | ~810 | Definitive architecture — three pillars, all layers, code examples |
| 2 | **[DESIGN_DECISIONS.md](DESIGN_DECISIONS.md)** | ~710 | 15 decisions with evidence, options, rationale |
| 3 | **[paykit-feature-mapping.md](paykit-feature-mapping.md)** | ~420 | 182 PayKit features mapped to BetterPay |
| 4 | **[provider-research-2026.md](provider-research-2026.md)** | ~430 | Provider pricing, APIs, BI regulations, QRIS data |
| 5 | **[COMPARISON.md](../COMPARISON.md)** | ~590 | Better Auth vs BetterPay architecture comparison |
| | **Total** | **~2,960** | |

---

## The 3 Pillars

```
┌─────────────────────────────────────────────────────────────────┐
│                        BetterPay                                 │
│                                                                   │
│  Pillar 1: ARCHITECTURE (from Better Auth)                      │
│  ├── Plugin-first design (12 capabilities)                      │
│  ├── better-call type-safe API router                           │
│  ├── Hook system (before/after with matchers)                   │
│  ├── Database hooks (before/after CRUD)                         │
│  ├── Transaction-aware hook queue                               │
│  ├── Adapter factory (multi-DB)                                 │
│  └── Multi-framework handlers                                   │
│                                                                   │
│  Pillar 2: DOMAIN MODEL (from PayKit)                           │
│  ├── Plan & Feature DSL (feature(), plan())                     │
│  ├── Entitlement engine (lazy reset, stacked CTE)               │
│  ├── Subscription state machine (5 states)                      │
│  ├── Normalized webhook events + action system                  │
│  ├── Product sync + versioning                                  │
│  └── Webhook idempotency pipeline                               │
│                                                                   │
│  Pillar 3: PAYMENT INFRA (from wabase, production-proven)       │
│  ├── 4 provider adapters (Midtrans, Xendit, Duitku, Pakasir)   │
│  ├── Circuit breaker per provider                               │
│  ├── Retry with exponential backoff + jitter                    │
│  ├── Replay protection (timestamp window)                       │
│  ├── Reconciliation worker (poll missed webhooks)               │
│  ├── Idempotency keys (atomic INSERT)                           │
│  └── Error taxonomy (12 error classes)                          │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 15 Design Decisions (Summary)

| # | Question | Answer | Why |
|---|----------|--------|-----|
| 1 | Framework or Service? | **Framework** (embedded library) | Better Auth/PayKit pattern, user owns data |
| 2 | Who manages billing cycle? | **BetterPay** (primary) | 80-90% Indonesian payment methods can't auto-debit (VA, QRIS, retail) |
| 3 | How to select provider? | **Priority + circuit breaker fallback** | Resilience + developer control |
| 4 | How to trigger billing? | **Cron template via CLI + endpoint** | Serverless-compatible, no setInterval |
| 5 | Where does customer pay? | **Provider's hosted page** (API-only) | Midtrans Snap / Xendit Payment Link already provide full checkout UI |
| 6 | How to handle migrations? | **Auto dev, block prod, CLI push** | PayKit-proven pattern |
| 7 | How to handle notifications? | **Plugin-based** (core fires events) | Separation of concerns |
| 8 | Client SDK design? | **Proxy with type inference** | PayKit pattern, zero config |
| 9 | How to match payments? | **Transaction record in DB** | Provider-agnostic, audit trail |
| 10 | Build strategy? | **Extract providers, rewrite rest** | Keep battle-tested provider logic |
| 11 | Testing strategy? | **Full pyramid + test clock** | Time simulation for billing cycles |
| 12 | One-time vs subscriptions? | **Layered** (core + billing plugin) | Progressive complexity |
| 13 | Multi-tenancy? | **Single merchant** | User's responsibility via metadata |
| 14 | Refunds? | **Deferred to v2** | VA/QRIS can't refund via API |
| 15 | MVP scope? | **One-time + 2 providers first** | Ship fast, validate, iterate |

---

## Key Research Findings

### Indonesian Payment Reality (June 2026)

**80-90% of Indonesian payments CANNOT auto-recur:**

```
❌ Virtual Account (BCA, BNI, BRI, Mandiri) — push-only, customer must manually pay each cycle
❌ QRIS — scan-based, no recurring mechanism
❌ E-wallets (without tokenization) — manual approval each time
❌ Retail (Indomaret, Alfamart) — customer must visit store
❌ Bank Transfer — manual

✅ Only ~10% can auto-debit:
├── Credit Card (needs PCI-DSS + bank recurring MID)
├── GoPay (needs Midtrans activation + account linking)
└── Direct Debit (Ayoconnect, separate integration)
```

**Implication:** BetterPay MUST manage billing cycle itself — generate payment link each cycle, send notifications, handle dunning. Provider-native subscription APIs (Xendit/Midtrans) are optimization, not primary path.

### Provider Landscape

| Provider | Best For | Subscription API? | DX Rating |
|----------|----------|:---:|:---:|
| **Xendit** | SaaS/Startups | ✅ Full (auto-billing + retries) | ⭐⭐⭐⭐⭐ |
| **Midtrans** | E-commerce | ✅ (needs recurring MID) | ⭐⭐⭐⭐ |
| **DOKU** | Enterprise | ✅ (enterprise) | ⭐⭐⭐ |
| **Duitku** | VA-heavy | ❌ None | ⭐⭐⭐ |

### BI Regulation PBI 10/2025 (Effective March 31, 2026)

- **TIKMI assessment** mandatory for all PSPs
- **SNAP compliance** mandatory for Open API PSPs
- **Min capital:** IDR 15 billion
- **Foreign ownership:** max 85% economic, 51% voting control Indonesian
- BetterPay itself is NOT a PSP (it's a framework), but users who operate as PSPs need compliance

### QRIS (2026)

- **MDR:** 0% (micro ≤Rp500K), 0.3% (micro >Rp500K), 0.7% (others)
- **63M users**, 45.3M merchants, 108% YoY growth
- **Cross-border:** 6 countries (TH, MY, SG, JP, KR, CN), targeting 8 by year end
- **QRIS Tap** (NFC) growing 1,200% MoM

---

## Architecture in One Diagram

```
Your App (Any Framework)
  Next.js │ Hono │ Express │ Fastify │ Bun │ Cloudflare
                    │
            ┌───────┴───────┐
            │ @betterpay/core│  ← Pure Node.js, zero framework deps
            │                │
            │  ┌──────────┐  │
            │  │ better-  │  │  ← Type-safe API router
            │  │ call     │  │
            │  └──────────┘  │
            │  ┌──────────┐  │
            │  │ Plugin   │  │  ← Better Auth-style plugins
            │  │ System   │  │
            │  └──────────┘  │
            │  ┌──────────┐  │
            │  │ Provider │  │  ← Priority + circuit breaker
            │  │ Registry │  │
            │  └──────────┘  │
            └───────┬───────┘
                    │
         ┌──────────┼──────────┬──────────┐
         │          │          │          │
    ┌────┴───┐ ┌───┴────┐ ┌──┴─────┐ ┌─┴───────┐
    │Midtrans│ │ Xendit │ │ Duitku │ │ Pakasir │  ← Extracted from wabase
    └────────┘ └────────┘ └────────┘ └─────────┘
```

---

## Package Structure

```
@betterpay/core              ← One-time payments + provider management + webhooks
@betterpay/billing           ← Plugin: subscriptions, entitlements, plans, invoices
@betterpay/midtrans          ← Provider adapter (from wabase)
@betterpay/xendit            ← Provider adapter (from wabase)
@betterpay/duitku            ← Provider adapter (from wabase)
@betterpay/pakasir           ← Provider adapter (from wabase)
@betterpay/notification-email    ← Plugin: email notifications
@betterpay/notification-whatsapp ← Plugin: WhatsApp notifications
@betterpay/client            ← Proxy-based client SDK
@betterpay/client-react      ← React hooks
@betterpay/ui                ← Optional: pricing table, billing portal
@betterpay/cli               ← init, push, status, listen
```

---

## MVP Roadmap

### Phase 1 — MVP (4 weeks)
**Goal:** Accept one-time payments via Midtrans/Xendit.

```
Week 1: Scaffold + core (better-call, plugin system, provider interface)
Week 2: Extract Midtrans + Xendit adapters from wabase
Week 3: Webhook pipeline + transaction record + framework handlers
Week 4: CLI (init, push, status) + client SDK + testing
```

### Phase 2 — Billing (3 weeks)
**Goal:** Full subscription management.

```
Week 5: Plan/Feature DSL + subscription state machine
Week 6: Entitlement engine + billing cycle + cron endpoint
Week 7: Duitku + Pakasir adapters + notification-email + test clock
```

### Phase 3 — Polish (3 weeks)
**Goal:** Production-ready ecosystem.

```
Week 8:  Client React hooks + UI components
Week 9:  WhatsApp notifications + more framework handlers
Week 10: E2E tests + docs site + demo app
```

---

## How This Was Built

### Process

1. **Deep dive PayKit** (sample/paykit) — read all source files, understand every pattern
2. **Deep dive Better Auth** (sample/better-auth) — plugin system, adapter factory, hooks, better-call
3. **Comparison** — head-to-head architecture comparison, identified gaps
4. **Feature mapping** — 182 PayKit features cataloged and mapped
5. **Provider research** — wabase codebase analysis (4 existing provider adapters)
6. **Exa deep research** — Indonesian provider pricing, APIs, BI regulations, QRIS developments
7. **Grilling session** — 15 architectural questions, each resolved with evidence

### Sources

| Source | What It Provided |
|--------|-----------------|
| PayKit v0.0.6 source | Domain model, plan DSL, entitlement engine, webhook pipeline |
| Better Auth v1.6.15 source | Plugin system, adapter factory, better-call, hooks, client SDK |
| wabase payment-gateway | 4 provider adapters, circuit breaker, reconciliation, state machine |
| wabase billing system | Subscription lifecycle, invoicing, cron jobs, email templates |
| Exa: provider comparison | Midtrans/Xendit/DOKU pricing, features, DX ratings |
| Exa: Midtrans docs | Snap API, Subscription API, GoPay tokenization, payment channels |
| Exa: Xendit docs | Payment Sessions, subscription webhooks, recurring MIT |
| Exa: DOKU docs | SNAP signature (symmetric/asymmetric), HMAC-SHA256, webhook format |
| Exa: BI Regulation | PBI 10/2025, TIKMI, SNAP compliance, capital requirements |
| Exa: QRIS developments | MDR rates, TUNTAS, cross-border, QRIS Tap, growth data |
| Exa: Indonesian SaaS | Ruangguru, Mekari Jurnal checkout patterns (all redirect to provider) |

---

## What's Next

1. **Start Phase 1 implementation** — scaffold monorepo, build core, extract Midtrans adapter
2. **Setup CI/CD** — Biome, knip, publint, Vitest, GitHub Actions
3. **Write first integration test** — mock provider + full payment flow
4. **Setup demo app** — Next.js app that accepts payment via BetterPay

---

*Research & architecture complete. Ready for code.*
