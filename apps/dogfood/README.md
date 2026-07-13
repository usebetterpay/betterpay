# Acme AI · BetterPay demo

Dashboard demo for **AI credit billing** using **`@betterpay/ui`** + live sandbox gateways.

## What it demos

| Area | Behavior |
|------|----------|
| **Plans** | Buy monthly/yearly plan → real SumoPod/Midtrans sandbox checkout |
| **Credits** | Buy one-shot credit packs → bonus balance |
| **Overview / Billing** | `SubscriptionSummary`, `EntitlementMeter`, `BillingPortal`, … |
| **Helpers** | Seed templates, burn credits, gateway switcher |

Not a marketing landing page.

## Public URL

**https://demo.betterpay.dev** — nginx → systemd user `betterpay-dogfood` → `127.0.0.1:8791`

Redeploy after UI changes:

```bash
cd apps/dogfood
pnpm build
systemctl --user restart betterpay-dogfood
```

Nginx/TLS setup (once): `bash deploy/setup-nginx.sh`

## Env (gitignored)

`apps/dogfood/.env`:

```bash
PUBLIC_ORIGIN=https://demo.betterpay.dev
SUMOPOD_API_KEY=…
SUMOPOD_IS_SANDBOX=true
# optional webhook auth from SumoPod dashboard
# SUMOPOD_WEBHOOK_SECRET=whsec_…
# SUMOPOD_WEBHOOK_TOKEN=whtok_…
# optional Midtrans
# MIDTRANS_SERVER_KEY=SB-Mid-server-…
```

Webhook URLs (configure in provider dashboards):

- `https://demo.betterpay.dev/api/webhooks/sumopod`
- `https://demo.betterpay.dev/api/webhooks/midtrans`

## Local dev

From repo root:

```bash
pnpm install
pnpm --filter @betterpay/dogfood dev
```

- Web: http://127.0.0.1:5173  
- API: http://127.0.0.1:8787 (dev) / production service uses **8791**

Default payment mode is **live sandbox** (real payment links). Helpers still have “Mark paid” as a fallback.
