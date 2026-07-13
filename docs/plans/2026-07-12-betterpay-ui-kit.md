# BetterPay UI Kit — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Skills:** `@shadcn-baseui`, `@shadcn-component-review`, `@frontend-design` / `@high-end-visual-design` when shaping visuals, `@react-best-practices` for composition.

**Goal:** Build a first-party **`@betterpay/ui`** package — production-ready React billing/payment UI for Indonesia — using **Base UI + shadcn Base style**, with a **distinct BetterPay visual language**, wired to BetterPay domain concepts (`plan()`, subscriptions, entitlements, invoices, IDR).

**Architecture:** Clean-room package inside the BetterPay monorepo. Domain-driven component set (not a port of any third-party UI kit). Primitives from shadcn Base (`@base-ui/react`); product components compose those primitives. Types align with `@betterpay/billing` / `@betterpay/core` where practical.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, CVA, `cn()`, `@base-ui/react`, shadcn style **`base-nova`** (compact, data-friendly), lucide-react, Vitest + optional React Testing Library, monorepo package `@betterpay/ui`.

---

## Hard constraints (non-negotiable)

### 1. No third-party kit in git history

| Rule | Detail |
|------|--------|
| **No copy-paste** | Do not copy source files, className strings wholesale, prop names, demo data, assets, or registry JSON from external billing UI kits into this repo |
| **No vendor paths** | Never commit paths, package names, or file names that imply we shipped someone else’s kit (`billingsdk`, `dodo`, etc.) |
| **No attribution debt** | Commits, PR titles, package.json, README, LICENSE comments must describe **BetterPay original work** only |
| **Reference only offline** | Any external repo used for *inspiration* stays **outside** the BetterPay git tree (sibling folder is OK). Do not `git submodule`, do not vendor it, do not commit screenshots of their brand |
| **Clean-room rewrite** | Implement from **requirements + BetterPay domain model**, not from their component source. If you looked at a reference, re-derive layout/props yourself |

**Allowed:** Studying public patterns (pricing cards, plan switchers, invoice tables) as industry UX.  
**Forbidden:** Line-level ports, identical structure + identical class stacks, reusing their `Plan` shape / theme system / component inventory names as a 1:1 map.

### 2. Distinct BetterPay style (not a visual clone)

Design direction — **“Indonesian payment infrastructure, calm and precise”**:

| Token | Direction |
|-------|-----------|
| Personality | Trustworthy fintech, not playful SaaS marketing kits |
| Density | Compact (base-nova): dashboards + billing portals |
| Radius | Controlled (`rounded-md` / `--radius`), not soft consumer pills everywhere |
| Color | Semantic shadcn tokens only; primary tuned for BetterPay (deep teal/ink or monochrome + one accent — pick one system and document in `packages/ui/DESIGN.md`) |
| Typography | Clear hierarchy, tabular nums for money (`tabular-nums`), IDR formatting via shared utils |
| Motion | Subtle 150–200ms; respect `prefers-reduced-motion` |
| Currency default | **IDR** first (Rp, no decimals for IDR display); multi-currency ready via ISO minor units |

**Anti-patterns to avoid (generic kit look):**

- Rainbow feature-check icons with random Tailwind color classes
- 8 near-identical pricing table variants as the MVP
- Hardcoded `$` / USD-first demos as the default story
- Theme playground “classic vs minimal” copied from elsewhere
- Marketing-heavy particle/sparkle chrome in the UI package

### 3. Best practices (enforced)

**Composition & structure**
- Compose `@betterpay/ui` primitives; product blocks never reimplement Dialog/Select from scratch
- Base UI: `render` prop, never `asChild`; Button-as-link: `render` + `nativeButton={false}`
- `data-slot` on semantic parts of every component
- CVA for variants; `className` always merged with `cn()`
- Controlled + uncontrolled patterns where forms need it
- Headless-friendly: presentational components accept data + callbacks; no hardcoded fetch to a vendor API

**Domain alignment**
- Prefer types that map to BetterPay concepts: plan id, group, interval, entitlement balance, subscription status (`scheduled | active | past_due | canceled | ended`), invoice status
- Money: integer minor units in props where possible; format for display with a single `formatMoney` util (IDR-aware)
- Status badges map canonical BetterPay statuses, not random English SaaS labels only

**Quality**
- TypeScript strict; export public types from package entry
- Accessibility: keyboard, focus-visible, labels, dialogs with titles, touch targets ~44px
- Spacing: `gap-*` not `space-y-*`; `size-*` for equal dimensions
- Tokens: semantic only (`bg-card`, `text-muted-foreground`) — no `text-zinc-400`
- No `any` in public API
- Unit tests for pure utils + critical state (plan interval toggle, status badge mapping)
- Story/demo app or docs MDX examples under BetterPay docs — not a forked marketing site

**Monorepo hygiene**
- Package: `packages/ui` → `@betterpay/ui`
- Peer deps: `react`, `react-dom`
- Follow existing package patterns (`package.json` exports, `tsconfig`, vitest)
- Commits: conventional, BetterPay-scoped (`feat(ui): …`)

---

## Product scope (MVP)

Ship a **focused** set of components (quality > quantity). Expand later.

### Primitives (shadcn Base, re-exported or local)

`button`, `badge`, `card`, `dialog`, `tabs`, `switch`, `separator`, `table`, `input`, `label`, `radio-group`, `select`, `dropdown-menu`, `tooltip`, `skeleton`

Install via shadcn into package-local `src/primitives/` (or `src/ui/`) with `base-nova`.

### Domain components (MVP)

| Component | Purpose |
|-----------|---------|
| `PricingTable` | 1 strong layout (monthly/yearly), plan cards, feature list, CTA |
| `PlanSwitcher` | Upgrade/downgrade selection (dialog or inline card) |
| `SubscriptionSummary` | Current plan, status, next billing, payment method summary |
| `CancelFlow` | Confirm cancel + optional reason; retention is optional secondary |
| `EntitlementMeter` | Linear usage: limit / remaining / reset hint |
| `InvoiceTable` | Invoice history with status + amount (IDR) |
| `PaymentStatusBanner` | Success / failure / past_due callouts |
| `BillingPortal` | Composition page: summary + invoices + usage + actions |

### Explicit non-goals (MVP)

- Eight pricing table skins
- Vendor-specific payment form clones
- Full checkout UI (providers own Snap / payment links)
- SMS/email template UIs
- Copying third-party registry/CLI install UX

---

## File map

```
packages/ui/
  package.json                 # @betterpay/ui
  tsconfig.json
  vitest.config.ts
  components.json              # base-nova, local paths
  DESIGN.md                    # visual language (tokens, density, IDR rules)
  src/
    index.ts                   # public exports only
    lib/
      cn.ts
      money.ts                 # formatMoney, IDR defaults
      status.ts                # subscription/invoice status → badge
    types/
      billing-ui.ts            # PlanView, SubscriptionView, InvoiceView, …
    primitives/                # Base UI shadcn components
      button.tsx
      …
    components/
      pricing-table.tsx
      plan-switcher.tsx
      subscription-summary.tsx
      cancel-flow.tsx
      entitlement-meter.tsx
      invoice-table.tsx
      payment-status-banner.tsx
      billing-portal.tsx
    styles/
      tokens.css               # optional CSS variables if package ships theme
  __tests__/
    money.test.ts
    status.test.ts
    pricing-table.test.tsx     # optional RTL

docs/ (optional later)
  content for UI package usage examples under BetterPay docs site
```

---

## Design decisions (locked unless user overrides)

1. **Package name:** `@betterpay/ui`
2. **Style:** `base-nova` + BetterPay token layer in `DESIGN.md`
3. **Default locale/currency display:** `id-ID` / `IDR`
4. **Data layer:** props-in / callbacks-out; optional thin hooks later (`useSubscriptionSummary`) — not in MVP unless free
5. **Single pricing layout** for MVP; variants via CVA (`density`, `emphasis`) not eight separate components
6. **Reference policy:** clean-room; external kits may be read for inspiration only, never committed

---

## Chunk 0: Package scaffold + design system

### Task 0.1: Scaffold `@betterpay/ui`

**Files:**
- Create: `packages/ui/package.json`, `tsconfig.json`, `vitest.config.ts`, `src/index.ts`, `src/lib/cn.ts`

- [ ] **Step 1:** Match monorepo conventions (workspace package, `type: module`, exports map, scripts `build`/`test`/`typecheck`)
- [ ] **Step 2:** Wire into `pnpm-workspace.yaml` if not already covered by `packages/*`
- [ ] **Step 3:** Commit `chore(ui): scaffold @betterpay/ui package`

### Task 0.2: Design language doc

**Files:**
- Create: `packages/ui/DESIGN.md`

- [ ] **Step 1:** Document color roles, radius, density, money formatting, status colors, do/don’t
- [ ] **Step 2:** Commit `docs(ui): add BetterPay UI design language`

### Task 0.3: Base UI primitives

**Files:**
- Create: `packages/ui/components.json`, `packages/ui/src/primitives/*`

- [ ] **Step 1:** Init shadcn with **base-nova** pointing into package paths
- [ ] **Step 2:** Add required primitives; depend on `@base-ui/react`
- [ ] **Step 3:** Verify zero `@radix-ui` / zero `asChild` in package
- [ ] **Step 4:** Commit `feat(ui): add Base UI shadcn primitives`

### Task 0.4: Shared utils + types

**Files:**
- Create: `src/lib/money.ts`, `src/lib/status.ts`, `src/types/billing-ui.ts`
- Test: `__tests__/money.test.ts`, `__tests__/status.test.ts`

- [ ] **Step 1:** TDD money formatter (IDR → `Rp 150.000`, USD minor units)
- [ ] **Step 2:** Map subscription/invoice statuses to badge variants
- [ ] **Step 3:** Define view-models (`PlanView`, `SubscriptionView`, …) inspired by BetterPay domain, not external kits
- [ ] **Step 4:** Commit `feat(ui): money + status utils and view types`

---

## Chunk 1: Core domain components

Implement one component per task. For each:

1. Write types + failing test or story props contract  
2. Implement with primitives + CVA  
3. Run component-review checklist  
4. Export from `src/index.ts`  
5. Commit

### Task 1.1: `PricingTable`

- Props: plans[], interval toggle, `onSelectPlan`, currency, className  
- Layout: BetterPay-original (e.g. asymmetric highlight on recommended plan, dense feature rows, IDR prices)  
- Review: tokens, gap, a11y for radio/toggle interval

### Task 1.2: `SubscriptionSummary`

- Props: plan name, status, period end, amount next, payment method label  
- Actions slots: `onUpgrade`, `onCancel` via buttons with callbacks

### Task 1.3: `PlanSwitcher`

- Dialog or card: list plans, show current, confirm change  
- Base UI Dialog + `render` triggers

### Task 1.4: `CancelFlow`

- Confirm dialog; optional reason select; destructive CTA styling via tokens

### Task 1.5: `EntitlementMeter`

- `used`, `limit`, `remaining`, `resetLabel`; linear bar; warn near limit

### Task 1.6: `InvoiceTable`

- Columns: date, number, amount, status, actions  
- Empty state included

### Task 1.7: `PaymentStatusBanner`

- Variants: success | failed | past_due | pending  
- Dismissible optional

### Task 1.8: `BillingPortal`

- Composes summary + meter + invoices + actions  
- Layout only; no data fetching

---

## Chunk 2: Docs, polish, integration

### Task 2.1: Package README

- Install, peer deps, minimal example using BetterPay-shaped data  
- No mention of third-party UI kits as “port of X”

### Task 2.2: Docs site page (optional if time)

- One MDX under BetterPay `docs/` showing PricingTable + SubscriptionSummary

### Task 2.3: Root README packages table

- Add `@betterpay/ui` row under Packages

### Task 2.4: Full verification

```bash
pnpm --filter @betterpay/ui typecheck
pnpm --filter @betterpay/ui test
pnpm --filter @betterpay/ui build
```

Component-review greps on `packages/ui`:

```bash
grep -Rn 'asChild\|@radix-ui' packages/ui || true
grep -RnE 'space-[xy]-|(zinc|gray|slate|neutral|stone)-[0-9]' packages/ui/src || true
```

### Task 2.5: Final commit

`feat(ui): ship BetterPay UI kit MVP`

---

## Definition of Done

- [ ] `@betterpay/ui` builds and tests pass
- [ ] Base UI only; no Radix; no `asChild`
- [ ] Distinct DESIGN.md applied; does not look like a generic multi-theme SaaS kit dump
- [ ] IDR-first money display; BetterPay status vocabulary
- [ ] MVP components exported and documented
- [ ] **Git history contains zero third-party kit source, brand assets, or “ported from X” commits that vendor their code**
- [ ] shadcn-component-review gates clean on shipped components (no ❌)

---

## Risk register

| Risk | Mitigation |
|------|------------|
| Accidental copy from reference clone | Keep reference outside monorepo; implement from this plan’s component list only |
| Scope creep (too many variants) | Hard cap: one PricingTable + CVA variants |
| Domain type drift from `@betterpay/billing` | View-models in UI package; map in app layer; optional peer dep later |
| Theme fights with consumer apps | Semantic tokens + minimal CSS variables; document override path |

---

## Out of scope / follow-ups

- React client hooks binding live `pay.billing.*`
- Full shadcn registry publishing
- Figma library
- Additional pricing layouts
- Refund UI (BetterPay refunds deferred)

---

## Agent reminder

You are **authoring BetterPay UI**, not migrating another product.  
If a step would require pasting external component source to “save time”, **stop and redesign** instead.
