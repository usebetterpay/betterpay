# npm publish checklist

Only publish packages that are real, tested, and not empty scaffolds.

## Always ship (when versioning)

| Package | Notes |
|---------|--------|
| `@betterpay/core` | Factory, webhooks, resilience, reconcile, notifications dispatch |
| `@betterpay/billing` | Subscriptions, entitlements, cycle runner, multi-stage dunning |
| `@betterpay/drizzle-adapter` | Durable repos + SQL migrations (`migrations/`) |
| `@betterpay/midtrans` / `xendit` / `duitku` / `tripay` / `mayar` / `pakasir` / `sumopod` | Provider adapters |
| `@betterpay/next` / `hono` / `express` / `bun` / `cloudflare` | Thin HTTP wrappers |
| `@betterpay/client` | Typed fetch client for real endpoints |
| `@betterpay/cli` | `init`, `push` (SQL migrations), `status`, `credentials` |
| `@betterpay/notification-email` | Resend channel (needs API key) |
| `@betterpay/notification-whatsapp` | Fonnte channel (needs `apiKey` / device token) |

## Still deferred (do not market as complete)

| Area | Why |
|------|-----|
| Product sync on `betterpay push` | Migrations only; providers not updated from plan defs |
| Multi-tenant SaaS / OJK / UI packages | Phase 7 growth — after dogfood |

## Pre-publish gate

```bash
pnpm install
pnpm typecheck
pnpm test --run
```

1. Bump version in package(s) intentionally.
2. Ensure `exports` / `types` point at built `dist/`.
3. Run package `build` if publishing from `dist`.
4. Confirm `@betterpay/drizzle-adapter` includes `migrations/` in the tarball (`files` field).
5. Tag release; do not claim “production-ready” without README Production checklist (durable repos + cron).
