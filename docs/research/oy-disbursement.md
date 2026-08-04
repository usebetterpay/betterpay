# OY! Indonesia Disbursement Research

**Scope:** OY! Indonesia payout/disbursement. Sources: `api-docs.oyindonesia.com` (Firecrawl map) + `docs.oyindonesia.com` public docs. Checked 2026-08-04.

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/remit` | Create disbursement (remit) |
| POST | `/api/remit-status` | Check remit status |
| POST | `/api/inquiry` | Account inquiry |

Base: Production `https://partner.oyindonesia.com`, Staging `https://api-stg.oyindonesia.com`.

## Auth

Headers:
- `X-OY-Username: <username>`
- `X-Api-Key: <apiKey>`
- `Content-Type: application/json`
- `Accept: application/json`

Plus IP allowlist — registered IP must match originating request.

## Status

`000`/`SUCCESS` → completed, `01`/`FAILED` → failed, else pending. Response includes `trxId`, `partnerTrxId`, `status { code, message }`.

## Notes

OY! is payout-only (no payment link). BetterPay adapter exposes `disburse()` instead of `createPaymentLink()`. Webhook verification via IP + header presence.

## Sources

- `https://api-docs.oyindonesia.com`
