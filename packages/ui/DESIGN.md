# BetterPay UI — Design Language

Visual system for `@betterpay/ui`. Indonesian payment infrastructure: calm, precise, trustworthy.

## Personality

- Fintech operations UI, not playful SaaS marketing kits
- Dense enough for billing portals and dashboards
- Clear hierarchy; money is always readable

## Foundations

| Token | Rule |
|-------|------|
| Density | Compact (aligned with shadcn base-nova scale) |
| Radius | `--radius` → `rounded-md` default; avoid pill-everywhere |
| Color | Semantic only: `background`, `foreground`, `card`, `muted`, `primary`, `destructive`, `border`, `ring` |
| Spacing | Tailwind scale multiples of 4; use `gap-*` in flex/grid, never `space-y-*` |
| Type | UI sans; **tabular-nums** for all monetary figures |
| Motion | 150–200ms transitions; honor `prefers-reduced-motion` |

## Currency (IDR first)

- Default locale `id-ID`, currency `IDR`
- IDR display: no fraction digits (`Rp 150.000`)
- Props prefer **integer major units for IDR** or explicit `amount` + `currency` with documented unit
- Shared helper: `formatMoney()`

## Status vocabulary

Align with BetterPay domain:

- Subscription: `scheduled` · `active` · `past_due` · `canceled` · `ended`
- Invoice: `draft` · `open` · `paid` · `overdue` · `void`
- Payment callouts: `success` · `failed` · `past_due` · `pending`

Map to badge/banner variants; do not invent parallel status taxonomies.

## Composition

- Style preset: **shadcn `base-nova`** (`packages/ui/components.json`)
- Product components compose primitives (`Button`, `Card`, `Dialog`, …)
- Base UI slotting: `render` prop (never Radix `asChild`)
  - Dialog trigger: `<DialogTrigger render={<Button />}>…</DialogTrigger>`
  - Button as link: `<Button render={<Link href="…" />} nativeButton={false}>…</Button>`
- Every semantic node: `data-slot="…"`
- Variants via CVA; consumer `className` wins via `cn()`
- Badge uses Base UI `useRender` / `mergeProps` for composition

## Do / Don’t

**Do**

- One strong pricing layout with CVA emphasis variants
- Semantic tokens and focus-visible rings
- Empty states on tables and portals
- Touch targets ~40–44px for primary actions

**Don’t**

- Hardcoded palette scales (`text-zinc-400`, `bg-gray-100`)
- Rainbow feature icons with random Tailwind colors
- USD-first defaults
- Shipping many near-identical pricing skins
- Coupling components to a specific payment vendor API

## Accessibility

- Dialogs have titles; buttons are real `<button>`s unless `nativeButton={false}` with link `render`
- Labels associated with inputs
- Status not conveyed by color alone (text + badge)
