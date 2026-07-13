# coss/ui vs @betterpay/ui — primitive audit

Date: 2026-07-13  
Reference: [cosscom/coss](https://github.com/cosscom/coss) `packages/ui/src/components/*`

## Scope

| BetterPay primitive | coss equivalent | Status |
|---------------------|-----------------|--------|
| `switch` | `switch` | **Fixed** — coss geometry + CSS safety net |
| `button` | `button` | OK product density (simpler variants than coss) |
| `badge` | `badge` | OK domain tones; coss has more sizes |
| `card` | `card` | OK flat ring; coss uses card-spacing tokens |
| `dialog` | `dialog` | OK bottom-sheet mobile; coss has ScrollArea |
| `separator` | `separator` | **Aligned** — orientation attr selectors |
| `table` | `table` | OK overflow container |

Domain components (Plan*, Invoice*, …) have no direct coss twin — product-specific.

## Switch (critical)

| Item | coss | BetterPay (after fix) |
|------|------|------------------------|
| Base | `@base-ui/react/switch` | same |
| Track size | `h-[calc(var(--thumb-size)+2px)] w-[calc(var(--thumb-size)*2-2px)]` | same |
| Thumb travel | `data-checked:translate-x-[calc(var(--thumb-size)-4px)]` | same Tailwind **+** pure CSS `transform` safety net |
| Size token | `--spacing(5)` / `sm:--spacing(4)` | rem `1.25rem` / `1rem` (no spacing() dependency) |
| Paint | `data-checked:bg-primary` | same + `[aria-checked]` CSS fallback |

Root cause of “over / stuck” reports: relying only on Tailwind `data-checked:*` or CSS `translate` property fighting utilities. Safety net uses `transform: translateX(...) !important` keyed off `data-checked` **and** `aria-checked`.

## Button

| Item | coss | BetterPay |
|------|------|-----------|
| Primitive | `useRender` + spinner loading | `ButtonPrimitive` (Base UI button) |
| Density | `h-9 sm:h-8` | `h-10 sm:h-9` (touch-first product) |
| Hit target | `pointer-coarse:after min-h-11` | same idea |
| Shadow | inset / xs on default | `shadow-none` (product flat CTAs) |

**Decision:** keep product density; not a 1:1 coss port.

## Badge / Separator / Dialog

- Badge: both `useRender` + `data-slot`; ours has billing tones.
- Separator: both Base UI; selectors updated to include `data-[orientation=…]` like coss.
- Dialog: ours is mobile bottom-sheet (product); coss is denser desktop-first with Viewport grid.

## Preview architecture (docs)

| | coss docs | blocks.so | BetterPay docs |
|--|-----------|-----------|----------------|
| Block preview | particles inline | **iframe** + resize | **iframe** `/preview/[name]` |
| Responsive | n/a particles | viewport = iframe | viewport = iframe |

## Tests

- Switch controlled click + `data-checked` / `aria-checked`
- BillingIntervalToggle `data-interval` flip
- PlanGroup yearly price update

## Residual (non-blocking)

- No coss Field/Label wrapper for switch (interval uses aria-label)
- Button loading spinner not ported (host uses disabled)
- Full coss particle suite not mirrored
