# BetterPay — Product Context

## Register

**product** (primary). Surfaces are billing portals, subscription management, pricing tables inside apps, and ops tools. Marketing/docs may use brand register later; UI kit defaults to product.

## Users

- Indonesian SaaS founders and backend engineers integrating Midtrans, Xendit, Duitku, etc.
- Ops/finance staff checking invoices, past_due, and entitlements in daylight office lighting on laptops.
- Context: task-focused, money-sensitive, low tolerance for decorative UI that obscures amounts or status.

## Product purpose

One TypeScript framework for Indonesian payment gateways plus subscription billing. `@betterpay/ui` serves that stack: presentational React blocks that make plans, usage, and invoices obvious without owning checkout (providers keep Snap / payment links).

## Personality

Calm infrastructure. Precise. Trustworthy. Dense when needed. Never playful marketing-kit energy.

## Anti-references

- Generic SaaS cream gradients and rainbow feature icons
- Navy + gold “fintech luxury” cliché
- Crypto neon-on-black
- Eight near-identical pricing skins
- Glassmorphism dialogs as default chrome
- Side-accent stripes on cards/alerts

## Strategic principles

1. Money and status are first-class: tabular figures, explicit labels, never color-only meaning.
2. IDR-first; locale `id-ID` by default.
3. Compose Base UI / shadcn primitives; domain components stay presentational (props + callbacks).
4. Restrained color: tinted neutrals + one cool primary accent for actions and selection only.
5. Familiar product patterns over invented affordances.
