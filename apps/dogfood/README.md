# Acme AI · BetterPay dogfood

Dashboard dogfood for **AI credit billing** using **`@betterpay/ui`**.

## What it demos

| Area | Behavior |
|------|----------|
| **Plans** | Buy monthly/yearly plan → pending QRIS payment |
| **Credits** | Buy one-shot credit packs → bonus balance |
| **Overview / Billing** | `SubscriptionSummary`, `EntitlementMeter`, `BillingPortal`, … |
| **Helpers** | Seed templates, burn credits, simulate paid/failed |

Not a marketing landing page. Not a multi-provider playground.

## Run

From repo root:

```bash
pnpm install
pnpm --filter @betterpay/dogfood dev
```

- Web: http://127.0.0.1:5173  
- API: http://127.0.0.1:8787  

## Stack

- Vite + React + React Router (dashboard SPA)
- Hono in-memory API (catalog + payments + credits)
- UI: workspace `@betterpay/ui` (source-linked in Vite for Tailwind scan)

Payment mode defaults to **simulate**. Live SumoPod QRIS can be wired later via env keys.
