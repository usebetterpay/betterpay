---
"@betterpay/core": patch
"@betterpay/billing": patch
"@betterpay/client": patch
"@betterpay/cashlez": patch
"@betterpay/durianpay": patch
"@betterpay/finpay": patch
"@betterpay/ipay88": patch
"@betterpay/ipaymu": patch
"@betterpay/paylabs": patch
"@betterpay/prismalink": patch
"@betterpay/singapay": patch
---

Security hardening + reliability batch: shared timing-safe signature helpers (`safeEqual`/`hmacMerchantOrder`), fail-closed Cashlez webhook verify, deep log redaction + `randomUUID` request/txn ids, HKDF credential keys with legacy decrypt fallback + fail-closed `decryptAll` (`tryDecryptAll` for best-effort), `Idempotency-Key` on create-transaction, opt-in Bearer auth for `POST /api/reconcile`, 4xx-aware retry filter, structured `BetterPayError` across core/billing, client error `status`/`code` passthrough.
