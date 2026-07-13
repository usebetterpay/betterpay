# BetterPay UI — Design System

Visual system for `@betterpay/ui`. Register: **product**.

## Scene

Ops and founders review subscriptions and invoices on a laptop in a bright office. The UI must make amounts and status obvious in seconds, without decorative chrome.

## Color strategy: Restrained

- Cool slate-teal neutrals (OKLCH hue ~235–240), never pure black/white.
- One primary (deep ink-teal) for primary actions and selection only (≤10% of surface).
- Semantic feedback: success / warning / destructive / info, desaturated enough for text.
- Light is the default working theme; dark is supported but not the identity.

## Anti-patterns (banned)

- Side-stripe accent borders on cards or alerts
- Gradient text
- Glassmorphism as default dialog chrome
- Navy + gold “fintech luxury”
- Rainbow feature check icons
- Identical icon+title+body card grids as the main pattern
- Modal as the first solution when inline works

## Typography

| Role | Size | Weight |
|------|------|--------|
| Page title | 1.5rem | 600 |
| Section | 0.875–1rem | 600 |
| Body / control | 0.875rem | 400–500 |
| Meta / caption | 0.75rem | 400–500 |
| Money | any | 500–600 + `tabular-nums` |

Family: system UI stack (`--font-sans`). Scale ratio ~1.15–1.2. No display fonts in product chrome.

## Density & shape

- **Mobile-first controls:** default button `h-10` / `sm:h-9` (comfortable thumb, denser desktop).
- Icon buttons follow the same scale (`size-10` → `sm:size-9`).
- Radius: `--radius` 8px; badges slightly rounded (`rounded-md`), not always full pill.
- Spacing: `gap-*` only; rhythm varies by section (header looser, tables denser).
- Touch: expand hit area with `pointer-coarse:after` (≥44px) without growing visual chrome.

## Elevation

- Cards: hairline `ring-1 ring-border` + optional `shadow-xs` only when `elevated`.
- Dialogs: flat `shadow-none` + solid scrim; light `backdrop-blur-[2px]` on overlay only.
- Switch thumb may use `shadow-sm/5` for depth of the knob only.
- No heavy drop shadows on CTAs.

## Dialog pattern

- **Mobile:** bottom sheet (`items-end`, rounded top, grab handle).
- **Desktop:** centered popup (`sm:items-center`, `sm:max-w-lg`).
- Footer: full-width stacked buttons on mobile, row on `sm+`.

## Motion

- 120–180ms, `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out expo-ish).
- State only (hover, open/close, switch thumb). No page-load choreography.
- Tokens zero durations under `prefers-reduced-motion`.
- Switch uses `motion-safe:` / `motion-reduce:transition-none` for thumb travel.

## Components (states required)

Every interactive primitive documents: default · hover · focus-visible · active · disabled.

| Concern | Pattern |
|---------|---------|
| Loading | Optional `loading` / `*Loading` props with skeleton rows (InvoiceTable, InvoiceCardList, BillingPortal); not a global spinner API |
| Empty | Explicit empty copy for lists/matrices (`emptyMessage`) |
| Exclusive pick | `role="radiogroup"` + `role="radio"` (PlanSwitcher) or native radio group (CancelFlow) |
| Interval | Shared `BillingIntervalToggle`; human labels via `formatBillingIntervalLabel` |
| Composition | Loading via host-driven props; primary actions can use `disabled` while submitting |

## Composition (Base UI / base-nova)

- Style: `components.json` → `base-nova`
- Slotting: `render` never `asChild`
- Button as link: `render` + `nativeButton={false}`
- `data-slot` on every semantic part (including Badge root)
- CVA + `cn()`; consumer `className` wins
- Switch: CSS `--thumb-size` geometry; `data-checked` / `data-unchecked` on thumb for translate

## Currency, copy & status

- Default `id-ID` / `IDR`, no fraction digits for IDR
- Status vocabulary matches `@betterpay/billing` (subscription + invoice + payment callouts)
- Status = badge label + tone, never color alone
- Product copy is English by default; hosts override via props (`title`, `emptyMessage`, …). Full i18n dictionaries are out of scope for v0.1.

## File map

| Path | Role |
|------|------|
| `src/styles/tokens.css` | OKLCH variables + utility bridges |
| `src/primitives/*` | Base UI / presentational primitives |
| `src/components/*` | Domain billing blocks |
| `src/lib/*` | money, dates, status, labels, controllable state |
