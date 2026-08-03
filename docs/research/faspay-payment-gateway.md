# Faspay Payment Gateway Research

**Scope:** Faspay Payment Gateway + Billing. Sources: `docs.faspay.co.id` (Firecrawl map 70+ URLs). Checked 2026-08-03.

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/payment` | Create payment (legacy) |
| POST | `/payment/status` | Check status |

Base: Sandbox `https://fpg-sandbox.faspay.co.id`, Production `https://fpg.faspay.co.id`. Additional modules: Faspay Billing 2.0, SendMe (Disbursement), SNAP migration path.

## Auth

- Legacy hash: `signature = HMAC-SHA256(merchantId + merchantTranId + amount, secret)`, sent in body `signature` field.
- SNAP RSA (migrated): `stringToSign = HTTPMethod:EndpointUrl:Lowercase(Hex(SHA256(minify(body)))):Timestamp`, RSA-SHA256, headers `X-TIMESTAMP`, `X-SIGNATURE`, `X-PARTNER-ID`.

## Status

`SUCCESS`/`PAID` → completed, `FAILED` → failed, `CANCELED` → canceled, `PENDING`/`UNPAID` → pending. Response codes `00`/`200` success.

## Sources

- `https://docs.faspay.co.id` (Payment Gateway, Billing 2.0 sections)
