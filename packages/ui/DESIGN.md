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

- Compact base-nova control heights (`h-8` default, not oversized marketing buttons).
- Radius: `--radius` 8px; badges slightly rounded (`rounded-md`), not always full pill.
- Spacing: `gap-*` only; rhythm varies by section (header looser, tables denser).
- Touch: primary actions ≥36–40px height; icon buttons square.

## Elevation

- Cards: hairline ring + optional `shadow-xs`, not heavy drop shadows.
- Dialogs: `shadow-md` + solid overlay (light scrim, no blur-by-default).

## Motion

- 120–180ms, `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out expo-ish).
- State only (hover, open/close, switch thumb). No page-load choreography.
- Honor `prefers-reduced-motion` (durations collapse to 0).

## Components (states required)

Every interactive primitive documents: default · hover · focus-visible · active · disabled.  
Loading via composition (spinner + disabled), not a bespoke `isLoading` API.

## Composition (Base UI / base-nova)

- Style: `components.json` → `base-nova`
- Slotting: `render` never `asChild`
- Button as link: `render` + `nativeButton={false}`
- `data-slot` on every semantic part
- CVA + `cn()`; consumer `className` wins

## Currency & status

- Default `id-ID` / `IDR`, no fraction digits for IDR
- Status vocabulary matches `@betterpay/billing` (subscription + invoice + payment callouts)
- Status = badge label + tone, never color alone

## File map

| Path | Role |
|------|------|
| `src/styles/tokens.css` | OKLCH variables + utility bridges |
| `src/primitives/*` | Base UI / presentational primitives |
| `src/components/*` | Domain billing blocks |
