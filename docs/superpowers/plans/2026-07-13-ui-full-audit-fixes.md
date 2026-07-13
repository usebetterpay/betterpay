# @betterpay/ui Full Audit Fixes — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close every P0–P3 finding from the `@betterpay/ui` audit so primitives, domain components, tests, DESIGN.md, docs demos, and registry stay production-complete with no leftover dead code or a11y gaps.

**Architecture:** Keep presentational, Base UI (`render`, not `asChild`), IDR-first. Fix in layers: (1) correctness/dead code, (2) primitive a11y/slots, (3) domain empty/controlled/copy, (4) test harness + component tests, (5) loading patterns, (6) DESIGN/docs sync, (7) optional visual smoke. Each chunk ships independently with green `pnpm --filter @betterpay/ui test` + `build`.

**Tech Stack:** React 19, `@base-ui/react`, CVA, Tailwind v4 tokens, Vitest (+ jsdom + Testing Library for new tests), Fumadocs demos, shadcn registry JSON under `docs/public/r/`.

**Source audit:** Conversation audit 2026-07-13 (P0–P3 list). Live docs: https://betterpay-docs.pages.dev

**Branch:** continue `feat/betterpay-ui` (or branch from it).

---

## File map (create / modify)

| Path | Responsibility |
|------|----------------|
| `packages/ui/src/components/billing-portal.tsx` | Remove dead `onUpgrade` ternary; clean action wiring |
| `packages/ui/src/primitives/badge.tsx` | Explicit `data-slot="badge"` |
| `packages/ui/src/primitives/switch.tsx` | Honor `prefers-reduced-motion` on thumb transition |
| `packages/ui/src/primitives/dialog.tsx` | Align shadow/blur with DESIGN (or document exception) |
| `packages/ui/src/components/plan-switcher.tsx` | Radiogroup semantics for plan options |
| `packages/ui/src/components/cancel-flow.tsx` | Accessible reason list (radiogroup or Base UI Radio) |
| `packages/ui/src/components/plan-comparison.tsx` | Empty state; optional interval toggle |
| `packages/ui/src/components/subscription-summary.tsx` | Humanize interval labels |
| `packages/ui/src/components/entitlement-meter.tsx` | Render `unit` when present |
| `packages/ui/src/components/invoice-table.tsx` | Optional `loading` skeleton |
| `packages/ui/src/components/invoice-card.tsx` | Optional list `loading` |
| `packages/ui/src/components/billing-portal.tsx` | Pass-through `loading` for invoices/usage |
| `packages/ui/src/lib/labels.ts` *(create)* | Shared interval / status human labels (EN default) |
| `packages/ui/src/index.ts` | Export new helpers / types if public |
| `packages/ui/DESIGN.md` | Sync density, elevation, dialog, motion |
| `packages/ui/vitest.config.ts` | `environment: 'jsdom'` for component tests |
| `packages/ui/package.json` | Add `@testing-library/react`, `@testing-library/jest-dom`, `jsdom` (dev) |
| `packages/ui/__tests__/setup.ts` *(create)* | jest-dom matchers |
| `packages/ui/__tests__/*.test.tsx` *(create)* | Component tests listed below |
| `docs/src/components/demos/index.tsx` | Comparison interval toggle demo; empty/loading demos if needed |
| `docs/src/content/docs/ui/components/*.mdx` | Props tables for new props |
| `docs/scripts/build-registry.mjs` | Rebuild after source changes (run only) |
| `docs/public/r/*` | Regenerated registry |

---

## Chunk 1: Correctness & dead code (P0)

### Task 1.1: Fix BillingPortal dead `onUpgrade` wiring

**Files:**
- Modify: `packages/ui/src/components/billing-portal.tsx`
- Test: `packages/ui/__tests__/billing-portal.test.tsx` (added in Chunk 4; for now manual review)

**Problem:** `SubscriptionSummary` is called with:

```tsx
onUpgrade={
  plans.length > 0 && onChangePlan
    ? undefined
    : undefined
}
```

Both branches are `undefined`. Upgrade CTA never appears on the summary card; plan change only via `PlanSwitcher` action row (intentional product choice, but code is dead).

- [x] **Step 1: Decide product behavior (default in this plan)**

**Decision:** Billing portal keeps plan change exclusively in the actions row (`PlanSwitcher`). Do **not** duplicate upgrade on `SubscriptionSummary`. Remove the dead prop entirely.

- [ ] **Step 2: Apply the fix**

Replace the `SubscriptionSummary` block with:

```tsx
<SubscriptionSummary subscription={subscription} />
```

No `onUpgrade` / `onCancel` on the summary inside the portal (actions row owns those triggers).

- [ ] **Step 3: Verify TypeScript**

```bash
pnpm --filter @betterpay/ui typecheck
```

Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add packages/ui/src/components/billing-portal.tsx
git commit -m "fix(ui): remove dead onUpgrade wiring in BillingPortal"
```

---

### Task 1.2: Badge `data-slot="badge"`

**Files:**
- Modify: `packages/ui/src/primitives/badge.tsx`

- [ ] **Step 1: Set DOM attribute explicitly**

In `useRender` props merge, include `data-slot: 'badge'`:

```tsx
return useRender({
  defaultTagName: 'span',
  props: mergeProps<'span'>(
    {
      'data-slot': 'badge',
      className: cn(badgeVariants({ variant: resolved }), className),
    },
    props,
  ),
  render,
  state: {
    slot: 'badge',
    variant: resolved,
  },
});
```

- [ ] **Step 2: Typecheck**

```bash
pnpm --filter @betterpay/ui typecheck
```

- [ ] **Step 3: Commit**

```bash
git add packages/ui/src/primitives/badge.tsx
git commit -m "fix(ui): emit data-slot=badge on Badge root"
```

---

## Chunk 2: Domain copy, empty states, model fields (P1/P2)

### Task 2.1: Shared human labels helper

**Files:**
- Create: `packages/ui/src/lib/labels.ts`
- Modify: `packages/ui/src/index.ts` (export if useful publicly)
- Test: `packages/ui/__tests__/labels.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// packages/ui/__tests__/labels.test.ts
import { describe, expect, it } from 'vitest';
import { formatBillingIntervalLabel } from '../src/lib/labels';

describe('formatBillingIntervalLabel', () => {
  it('humanizes month and year', () => {
    expect(formatBillingIntervalLabel('month')).toBe('Monthly');
    expect(formatBillingIntervalLabel('year')).toBe('Yearly');
  });
  it('humanizes custom', () => {
    expect(formatBillingIntervalLabel('custom')).toBe('Custom');
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
pnpm --filter @betterpay/ui test -- __tests__/labels.test.ts
```

- [ ] **Step 3: Implement**

```ts
// packages/ui/src/lib/labels.ts
import type { BillingInterval } from '../types/billing-ui';

export type IntervalLabelInput = BillingInterval | 'custom' | string;

/** English product labels for billing intervals (host can override via props later). */
export function formatBillingIntervalLabel(interval: IntervalLabelInput): string {
  switch (interval) {
    case 'month':
      return 'Monthly';
    case 'year':
      return 'Yearly';
    case 'custom':
      return 'Custom';
    default:
      return String(interval);
  }
}
```

Export from `index.ts` under Utils.

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/lib/labels.ts packages/ui/src/index.ts packages/ui/__tests__/labels.test.ts
git commit -m "feat(ui): add formatBillingIntervalLabel helper"
```

---

### Task 2.2: SubscriptionSummary humanized interval

**Files:**
- Modify: `packages/ui/src/components/subscription-summary.tsx`

- [ ] **Step 1: Use helper**

```tsx
import { formatBillingIntervalLabel } from '../lib/labels';

// in CardDescription:
<CardDescription>
  Subscription · {formatBillingIntervalLabel(subscription.interval)}
</CardDescription>
```

- [ ] **Step 2: Typecheck + commit**

```bash
pnpm --filter @betterpay/ui typecheck
git add packages/ui/src/components/subscription-summary.tsx
git commit -m "fix(ui): humanize subscription interval label"
```

---

### Task 2.3: EntitlementMeter render `unit`

**Files:**
- Modify: `packages/ui/src/components/entitlement-meter.tsx`

- [ ] **Step 1: Include unit in description and remaining line**

When `entitlement.unit` is set:

```tsx
const unitSuffix = entitlement.unit ? ` ${entitlement.unit}` : '';
// description:
`${used.toLocaleString('id-ID')} of ${limit.toLocaleString('id-ID')}${unitSuffix} used`
// remaining:
`Remaining: ${remaining.toLocaleString('id-ID')}${unitSuffix}`
```

- [ ] **Step 2: Commit**

```bash
git add packages/ui/src/components/entitlement-meter.tsx
git commit -m "fix(ui): render entitlement unit labels"
```

---

### Task 2.4: PlanComparison empty state + optional interval toggle

**Files:**
- Modify: `packages/ui/src/components/plan-comparison.tsx`
- Modify: `docs/src/components/demos/index.tsx`
- Modify: `docs/src/content/docs/ui/components/plan-comparison.mdx`

- [ ] **Step 1: Empty plans**

At top of render:

```tsx
if (plans.length === 0) {
  return (
    <div
      data-slot="plan-comparison-empty"
      className={cn(
        'rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground shadow-none ring-1 ring-border',
        className,
      )}
      {...props}
    >
      No plans to compare.
    </div>
  );
}
```

- [ ] **Step 2: Optional interval control (uncontrolled default)**

Add props:

```ts
showIntervalToggle?: boolean;
defaultInterval?: BillingInterval;
onIntervalChange?: (interval: BillingInterval) => void;
// existing interval? stays for controlled mode
```

Wire with `useControllableState` (mark file `'use client'` if not already).

When `showIntervalToggle`, render a compact Monthly/Yearly control above the matrix (reuse Switch pattern from `PlanGroupIntervalToggle` or extract shared `BillingIntervalToggle` — prefer extract if both need it).

**Prefer extract:**

- Create: `packages/ui/src/components/billing-interval-toggle.tsx`
- Props: `value`, `onChange`, `className`
- Use from `PlanGroupIntervalToggle` and `PlanComparison`

- [ ] **Step 3: Demo**

```tsx
export function DemoPlanComparison() {
  return (
    <DemoShell>
      <PlanComparison
        plans={demoPlans}
        showIntervalToggle
        defaultInterval="month"
        onSelectPlan={(id) => console.log(id)}
      />
    </DemoShell>
  );
}
```

- [ ] **Step 4: Docs props table** — add `showIntervalToggle`, `defaultInterval`, `onIntervalChange`.

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/components/plan-comparison.tsx \
  packages/ui/src/components/billing-interval-toggle.tsx \
  packages/ui/src/components/plan-group.tsx \
  packages/ui/src/index.ts \
  docs/src/components/demos/index.tsx \
  docs/src/content/docs/ui/components/plan-comparison.mdx
git commit -m "feat(ui): plan comparison empty state and interval toggle"
```

---

## Chunk 3: A11y for selection controls (P1)

### Task 3.1: PlanSwitcher radiogroup

**Files:**
- Modify: `packages/ui/src/components/plan-switcher.tsx`

- [ ] **Step 1: Semantics**

```tsx
<ul
  data-slot="plan-switcher-list"
  role="radiogroup"
  aria-label={title}
  className="..."
>
  {plans.map((plan) => (
    <li key={plan.id} role="none">
      <button
        type="button"
        role="radio"
        aria-checked={selected === plan.id}
        data-slot="plan-switcher-option"
        onClick={() => setSelected(plan.id)}
        className={...}
      >
        ...
      </button>
    </li>
  ))}
</ul>
```

- [ ] **Step 2: Keyboard (optional but recommended)**

On radiogroup `onKeyDown`: ArrowUp/Down/Left/Right move selection among plans; Space/Enter confirm selection (already selected on click). Minimal implementation:

```tsx
const ids = plans.map((p) => p.id);
const idx = ids.indexOf(selected);
// ArrowDown → ids[(idx+1)%ids.length] setSelected
```

- [ ] **Step 3: Commit**

```bash
git add packages/ui/src/components/plan-switcher.tsx
git commit -m "fix(ui): PlanSwitcher radiogroup and keyboard navigation"
```

---

### Task 3.2: CancelFlow accessible reasons

**Files:**
- Modify: `packages/ui/src/components/cancel-flow.tsx`

**Decision (pragmatic):** Keep native radios (no new Radio primitive dependency) but wrap properly:

```tsx
<fieldset data-slot="cancel-flow-reasons" className="flex flex-col gap-2">
  <legend className="mb-1 text-sm font-medium">Why are you leaving? (optional)</legend>
  <div role="radiogroup" aria-label="Cancellation reason" className="flex flex-col gap-2">
    {reasons.map((reason) => (
      <label key={reason.id} className="flex min-h-11 ...">
        <input
          type="radio"
          name="cancel-reason"
          value={reason.id}
          checked={reasonId === reason.id}
          onChange={() => setReasonId(reason.id)}
          className="size-4 shrink-0 accent-primary"
        />
        <span>...</span>
      </label>
    ))}
  </div>
</fieldset>
```

Ensure each input has an associated accessible name (label wrapping is enough).

- [ ] **Step 1: Apply radiogroup wrapper**
- [ ] **Step 2: Commit**

```bash
git add packages/ui/src/components/cancel-flow.tsx
git commit -m "fix(ui): CancelFlow reason radiogroup accessibility"
```

---

### Task 3.3: Switch reduced-motion

**Files:**
- Modify: `packages/ui/src/primitives/switch.tsx`

- [ ] **Step 1: Motion-safe transitions**

Replace hard-coded duration classes with:

```tsx
'motion-safe:[transition:translate_.15s,border-radius_.15s,scale_.1s_.1s,transform-origin_.15s]',
'motion-reduce:transition-none',
```

On root:

```tsx
'motion-safe:transition-[background-color,box-shadow] motion-safe:duration-200',
'motion-reduce:transition-none',
```

- [ ] **Step 2: Commit**

```bash
git add packages/ui/src/primitives/switch.tsx
git commit -m "fix(ui): respect prefers-reduced-motion on Switch"
```

---

## Chunk 4: Test infrastructure + component tests (P1)

### Task 4.1: Enable jsdom + Testing Library

**Files:**
- Modify: `packages/ui/package.json`
- Modify: `packages/ui/vitest.config.ts`
- Create: `packages/ui/__tests__/setup.ts`

- [ ] **Step 1: Install dev deps from monorepo root**

```bash
pnpm --filter @betterpay/ui add -D jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

- [ ] **Step 2: Vitest config**

```ts
// packages/ui/vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./__tests__/setup.ts'],
    include: ['__tests__/**/*.{test,spec}.{ts,tsx}'],
  },
});
```

```ts
// packages/ui/__tests__/setup.ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 3: Confirm existing node-style tests still pass**

```bash
pnpm --filter @betterpay/ui test
```

Expected: all previous 12+ tests pass under jsdom.

- [ ] **Step 4: Commit**

```bash
git add packages/ui/package.json packages/ui/vitest.config.ts packages/ui/__tests__/setup.ts pnpm-lock.yaml
git commit -m "chore(ui): jsdom and Testing Library for component tests"
```

---

### Task 4.2: Switch + PlanGroup interval tests

**Files:**
- Create: `packages/ui/__tests__/switch.test.tsx`
- Create: `packages/ui/__tests__/plan-group.test.tsx`

- [ ] **Step 1: Switch test (controlled)**

```tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Switch } from '../src/primitives/switch';

describe('Switch', () => {
  it('calls onCheckedChange when clicked', async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(<Switch checked={false} onCheckedChange={onCheckedChange} aria-label="Bill yearly" />);
    await user.click(screen.getByRole('switch', { name: 'Bill yearly' }));
    expect(onCheckedChange).toHaveBeenCalled();
    expect(onCheckedChange.mock.calls[0][0]).toBe(true);
  });
});
```

- [ ] **Step 2: PlanGroup interval toggles prices**

Use minimal plan fixtures (2 plans with distinct monthly/yearly amounts). Render `PlanGroup` with `defaultInterval="month"`, click Yearly label / switch, assert yearly amount text appears (via `formatMoney`).

```tsx
import { PlanGroup } from '../src/components/plan-group';
// plans fixture: monthlyAmount 100000, yearlyAmount 1000000
// after toggle, screen should show formatted yearly
```

- [ ] **Step 3: Run tests**

```bash
pnpm --filter @betterpay/ui test
```

- [ ] **Step 4: Commit**

```bash
git add packages/ui/__tests__/switch.test.tsx packages/ui/__tests__/plan-group.test.tsx
git commit -m "test(ui): Switch and PlanGroup interval toggle coverage"
```

---

### Task 4.3: CancelFlow + PlanSwitcher + PlanComparison tests

**Files:**
- Create: `packages/ui/__tests__/cancel-flow.test.tsx`
- Create: `packages/ui/__tests__/plan-switcher.test.tsx`
- Create: `packages/ui/__tests__/plan-comparison.test.tsx` (extend existing or new `.tsx`)

- [ ] **Step 1: CancelFlow**

- Open dialog via trigger
- Select a reason
- Confirm → `onConfirm` called with `{ reasonId }`
- Keep → dialog closes, no confirm

- [ ] **Step 2: PlanSwitcher**

- Open, select non-current plan, Confirm → `onConfirm(planId)`
- Confirm disabled when selected === current

- [ ] **Step 3: PlanComparison**

- Empty plans → "No plans to compare"
- With plans + `showIntervalToggle` → toggle changes displayed period suffix `/yr` vs `/mo`

- [ ] **Step 4: Commit**

```bash
git add packages/ui/__tests__/cancel-flow.test.tsx \
  packages/ui/__tests__/plan-switcher.test.tsx \
  packages/ui/__tests__/plan-comparison*.ts*
git commit -m "test(ui): dialog flows and plan comparison coverage"
```

---

### Task 4.4: Badge data-slot + BillingPortal smoke

**Files:**
- Create: `packages/ui/__tests__/badge.test.tsx`
- Create: `packages/ui/__tests__/billing-portal.test.tsx`

- [ ] **Step 1: Badge**

```tsx
render(<Badge>Paid</Badge>);
expect(screen.getByText('Paid')).toHaveAttribute('data-slot', 'badge');
```

- [ ] **Step 2: BillingPortal smoke**

Render with demo-like props; assert title "Billing", invoice section present, no throw.

- [ ] **Step 3: Commit**

```bash
git add packages/ui/__tests__/badge.test.tsx packages/ui/__tests__/billing-portal.test.tsx
git commit -m "test(ui): Badge slot and BillingPortal smoke"
```

---

## Chunk 5: Loading patterns (P2)

### Task 5.1: InvoiceTable / InvoiceCardList loading

**Files:**
- Modify: `packages/ui/src/components/invoice-table.tsx`
- Modify: `packages/ui/src/components/invoice-card.tsx`
- Modify: docs MDX props tables

**API:**

```ts
loading?: boolean;
```

When `loading`:

- InvoiceTable: show 3 skeleton rows (pulse bars) inside card, `aria-busy="true"`
- InvoiceCardList: show 3 skeleton cards

Do **not** invent a full Skeleton primitive yet — local `div` with `animate-pulse bg-muted rounded-md h-4` is enough (YAGNI). If `animate-pulse` unavailable in host, use static muted bars.

- [ ] **Step 1: Implement loading UI**
- [ ] **Step 2: Unit test** `loading` sets `aria-busy`
- [ ] **Step 3: Commit**

```bash
git commit -m "feat(ui): loading states for invoice table and cards"
```

---

### Task 5.2: BillingPortal loading passthrough

**Files:**
- Modify: `packages/ui/src/components/billing-portal.tsx`
- Modify: `docs/src/content/docs/ui/components/billing-portal.mdx`

```ts
invoicesLoading?: boolean;
usageLoading?: boolean;
```

Pass `loading={invoicesLoading}` to InvoiceTable/CardList. For usage, optional skeleton block when `usageLoading && entitlements.length === 0`.

- [ ] **Step 1: Wire props**
- [ ] **Step 2: Docs**
- [ ] **Step 3: Commit**

```bash
git commit -m "feat(ui): BillingPortal loading flags for invoices and usage"
```

---

## Chunk 6: DESIGN.md + motion/elevation sync (P2)

### Task 6.1: Update DESIGN.md to match shipped UI

**Files:**
- Modify: `packages/ui/DESIGN.md`

Update sections:

| Topic | New truth |
|-------|-----------|
| Density | Mobile-first: default button `h-10` / `sm:h-9`; desktop dense |
| Touch | `pointer-coarse` hit target ≥44px via pseudo-element |
| Elevation | Cards: ring + optional `shadow-xs` elevated only; dialogs: `shadow-none` + light scrim; Switch thumb may use `shadow-sm/5` |
| Dialog | Mobile bottom sheet; desktop centered; optional `backdrop-blur-[2px]` |
| Motion | 120–180ms; Switch uses motion-safe transitions; tokens zero under `prefers-reduced-motion` |
| Components checklist | Add: empty states for lists; loading optional; radiogroup for exclusive picks |

- [ ] **Step 1: Edit DESIGN.md**
- [ ] **Step 2: Commit**

```bash
git add packages/ui/DESIGN.md
git commit -m "docs(ui): sync DESIGN.md with shipped density and dialog patterns"
```

---

### Task 6.2: Dialog elevation note (code or design)

**Decision:** Keep current dialog (`shadow-none` + light blur) — already product direction. DESIGN.md update in 6.1 is enough. No code change unless blur fails a11y (then remove blur only).

- [ ] **Step 1: Confirm no further dialog code change**
- [ ] **Step 2: Skip commit if no code delta**

---

## Chunk 7: Docs, registry, deploy

### Task 7.1: Rebuild registry + docs build

**Files:** regenerated under `docs/public/r/`

- [ ] **Step 1: Registry**

```bash
pnpm --filter @betterpay/docs registry:build
```

- [ ] **Step 2: Docs production build**

```bash
pnpm --filter @betterpay/docs build
```

Expected: compile OK, static export OK.

- [ ] **Step 3: Commit registry if tracked**

```bash
git add docs/public/r
git commit -m "chore(docs): regenerate shadcn registry after ui fixes"
```

---

### Task 7.2: Deploy Cloudflare (production + branch)

```bash
cd docs
pnpm run pages:build
npx wrangler pages deploy out --project-name betterpay-docs --branch main --commit-dirty=true
npx wrangler pages deploy out --project-name betterpay-docs --branch feat/betterpay-ui --commit-dirty=true
```

- [ ] **Step 1: Deploy**
- [ ] **Step 2: Smoke checklist on production**

| Check | URL / action |
|-------|----------------|
| Pricing interval switch | `/ui/components/pricing-table/` Mobile + desktop |
| Plan comparison toggle | `/ui/components/plan-comparison/` |
| Cancel sheet | Billing portal → Cancel |
| Plan switcher radio | Change plan → arrows / click |
| Invoice empty | (demo has data; optional local empty prop) |
| Install command left | pricing-table page |
| React Grab script | view-source has unpkg react-grab |

---

## Chunk 8: Optional hardening (P3 — do if time)

### Task 8.1: Invoice download disabled semantics

Document in InvoiceTable MDX:

- If only `onDownload` is provided, button always enabled (host handles fetch).
- If only `downloadUrl`, render as link later (future).

Optional code improvement:

```tsx
// Prefer explicit:
disabled={onDownload ? false : !invoice.downloadUrl}
```

- [ ] **Step 1: Clarify disabled condition + docs**
- [ ] **Step 2: Commit if code changed**

---

### Task 8.2: Playwright mobile smoke (optional CI)

**Only if monorepo already has Playwright or team wants it.**

- Create: `docs/e2e/ui-smoke.spec.ts` (or packages/ui e2e)
- Assert pricing page loads, switch role exists, click toggles `aria-checked`

Skip if no Playwright infra — do not add heavy CI without team buy-in.

---

### Task 8.3: i18n strategy note (no full i18n)

Add short section to `packages/ui/README.md` or DESIGN.md:

> Copy is English by default. Hosts may override via props (`title`, `description`, `triggerLabel`, `emptyMessage`, …). Full i18n dictionaries are out of scope for v0.1.

- [ ] **Step 1: Document**
- [ ] **Step 2: Commit**

---

## Verification gate (before "done")

Run from monorepo root:

```bash
pnpm --filter @betterpay/ui typecheck
pnpm --filter @betterpay/ui test
pnpm --filter @betterpay/ui build
pnpm --filter @betterpay/docs build
```

All must exit 0.

### Acceptance matrix (maps audit → done)

| Audit ID | Acceptance |
|----------|------------|
| P0 BillingPortal dead code | No dead ternary; summary has no fake onUpgrade |
| P1 Badge data-slot | DOM `data-slot="badge"` |
| P1 PlanSwitcher a11y | `role="radiogroup"` + `role="radio"` + `aria-checked` |
| P1 CancelFlow a11y | Named radiogroup for reasons |
| P1 PlanComparison empty | Empty copy when `plans=[]` |
| P1 unit field | Unit shown on meter when set |
| P1 tests | Switch, PlanGroup, CancelFlow, PlanSwitcher, Comparison covered |
| P2 interval labels | Subscription shows Monthly/Yearly |
| P2 comparison toggle | `showIntervalToggle` works in demo |
| P2 loading | Invoice* `loading` + portal flags |
| P2 DESIGN.md | Matches shipped UI |
| P2 reduced-motion | Switch uses motion-safe/reduce |
| P3 docs/deploy | Registry rebuilt; Pages production smoke OK |

---

## Out of scope (explicit YAGNI)

- Full i18n framework (react-intl / next-intl)
- New primitives: Radio, Skeleton, Select, Toast
- Visual regression SaaS (Chromatic)
- Migrating CancelFlow to Base UI Radio package
- Changing public billing domain types in `@betterpay/billing`
- Dark-mode product redesign

---

## Execution order summary

```
Chunk 1  P0 dead code + Badge slot          ~30m
Chunk 2  Labels, unit, comparison empty     ~1–2h
Chunk 3  A11y radiogroups + motion          ~1h
Chunk 4  Vitest jsdom + component tests     ~2–3h
Chunk 5  Loading props                      ~1h
Chunk 6  DESIGN.md                          ~30m
Chunk 7  Registry + deploy + smoke          ~45m
Chunk 8  Optional P3                        as time allows
```

**Estimated total:** ~1–1.5 focused days for Chunks 1–7.

---

## Commit hygiene

- Conventional commits: `fix(ui):`, `feat(ui):`, `test(ui):`, `docs(ui):`, `chore(ui):`
- One logical concern per commit (matches tasks above)
- Do not commit `.agents/`, secrets, or unsolicited lockfile noise outside pnpm changes
- After UI source changes that affect registry files, always `registry:build` before deploy

---

## Handoff

Plan complete and saved to:

`docs/superpowers/plans/2026-07-13-ui-full-audit-fixes.md`

**Ready to execute?** Say **gas** / **execute plan** and the agent should run Chunk 1 → 7 with subagent-driven or sequential execution, stopping only on red tests or deploy auth failures.

## Deviations
- Badge `data-slot` applied via props cast (useRender typings reject custom attrs on first merge arg).
- Invoice download `disabled` simplified to always enabled when `onDownload` provided (TS dead-condition fix).
- PlanComparison money assertions use body textContent (Intl NBSP breaks exact getByText).
