# @betterpay/prismalink

## 0.1.1

### Patch Changes

- dc7276e: Security hardening + reliability batch: shared timing-safe signature helpers (`safeEqual`/`hmacMerchantOrder`), fail-closed Cashlez webhook verify, deep log redaction + `randomUUID` request/txn ids, HKDF credential keys with legacy decrypt fallback + fail-closed `decryptAll` (`tryDecryptAll` for best-effort), `Idempotency-Key` on create-transaction, opt-in Bearer auth for `POST /api/reconcile`, 4xx-aware retry filter, structured `BetterPayError` across core/billing, client error `status`/`code` passthrough.
- Updated dependencies [dc7276e]
  - @betterpay/core@0.1.2
