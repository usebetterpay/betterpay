# Contributing to BetterPay

## Dev setup

```bash
pnpm install --frozen-lockfile
pnpm --filter @betterpay/core build
pnpm typecheck
pnpm test --run
pnpm lint
```

## Conventions

- Add a changeset for any publishable package change: `pnpm changeset`.
- Provider adapters: reuse `safeEqual` / `hmacMerchantOrder` from `@betterpay/core`; never hand-roll xor compare. Fail closed on missing secrets.
- Errors: throw `BetterPayError` subclasses (`ValidationError`, `NotFoundError`, `ConflictError`, …), never raw `Error` in services.
- Webhooks: verify signature → freshness check → normalize → idempotent apply.
- `POST /api/reconcile` requires `reconciliation.secret` (or `BETTERPAY_RECONCILE_SECRET`) in production.
- `POST /api/create-transaction` supports `Idempotency-Key` / `X-Idempotency-Key` headers.
- Credential crypto: HKDF-SHA256 current, legacy SHA-256 fallback on decrypt only.

## Security

Do not commit secrets. Report vulnerabilities to ujangas1908@gmail.com (see README Security).
