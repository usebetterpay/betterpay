# BetterPay Phase 2 (Billing) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add subscription management, entitlement tracking, billing cycle, and invoice generation as an opt-in billing plugin on top of Phase 1 core.

**Architecture:** New `@betterpay/billing` package that registers as a BetterPay plugin. Provides Plan/Feature DSL, subscription state machine (5 states), entitlement engine (check + report with lazy reset), billing cycle runner, and invoice generation. All in-memory for MVP (drizzle adapter deferred).

**Tech Stack:** TypeScript, Vitest, better-call (already in core), Phase 1 core package

---

## File Structure

```
packages/billing/
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── src/
│   ├── index.ts                    # Plugin factory + public exports
│   ├── schema.ts                   # feature(), plan(), Zod validation
│   ├── normalize.ts                # normalizeSchema(), computePlanHash()
│   ├── types.ts                    # Shared types for billing domain
│   ├── subscription/
│   │   ├── index.ts
│   │   ├── state-machine.ts        # Subscription states + transitions
│   │   └── service.ts              # subscribe, cancel, upgrade, downgrade
│   ├── entitlement/
│   │   ├── index.ts
│   │   └── service.ts              # check(), report(), lazy reset
│   ├── customer/
│   │   ├── index.ts
│   │   └── service.ts              # Customer CRUD + default plan assignment
│   ├── invoice/
│   │   ├── index.ts
│   │   └── service.ts              # Invoice generation + dunning
│   └── billing-cycle/
│       ├── index.ts
│       └── runner.ts               # runBillingCycle() + cron endpoint
└── __tests__/
```

---

## Tasks

| # | Component | Key Deliverable |
|---|-----------|----------------|
| 1 | Billing package scaffold | package.json, tsconfig, vitest config |
| 2 | Plan & Feature DSL | feature(), plan() with Zod validation |
| 3 | Schema normalization | normalizeSchema(), computePlanHash() |
| 4 | Customer service | Customer CRUD + default plan assignment |
| 5 | Subscription state machine | 5 states + valid transitions |
| 6 | Subscription service | subscribe, cancel, upgrade, downgrade |
| 7 | Entitlement engine | check() + report() with lazy reset |
| 8 | Invoice service | Invoice record generation |
| 9 | Billing cycle runner | runBillingCycle() + cron endpoint |
| 10 | Billing plugin factory | Plugin that wires everything into core |
| 11 | Integration tests | Full subscribe → pay → entitlement flow |
| 12 | Update core exports | Re-export billing types when plugin loaded |
| 13 | Update demo app | Add billing demo to demo/index.ts |
