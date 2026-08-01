# Espay SNAP Integration Research

**Scope:** Espay SNAP Host-to-Host + VA/QRIS. Sources: `docs.espay.id` (Firecrawl map 100+ URLs). Checked 2026-08-01.

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/apimerchant/v1.0/debit/payment-host-to-host` | Host-to-Host redirect (webRedirectUrl) |
| POST | `/v1.0/transfer-va/create-va` | Create VA |
| POST | `/v1.0/transfer-va/status` | Inquiry Status |
| POST | `/v1.0/qr/qr-mpm-generate` | Generate QRIS |
| POST | `/v1.0/qr/qr-mpm-query` | Query QRIS |

Base: Sandbox `https://sandbox-api.espay.id`, Production `https://api-merchant.espay.id`.

## Headers

Same SNAP as Winpay/DOKU: `X-TIMESTAMP`, `X-SIGNATURE`, `X-PARTNER-ID`, `X-EXTERNAL-ID`, `CHANNEL-ID`. Signature modes: `asymmetric` (RSA-SHA256) and `hash` (HMAC-SHA256 of minified body).

## Signature

Asymmetric: `stringToSign = HTTPMethod:EndpointUrl:Lowercase(Hex(SHA256(minify(body)))):Timestamp`, RSA-SHA256.
Hash: `HMAC-SHA256(minify(body), secret)` hex.

## Notes

Host-to-Host returns `webRedirectUrl` for checkout redirect. Falls back to direct VA if no redirect. QRIS uses same SNAP paths. Response codes `2005400` (Host-to-Host), `2002700` (VA), `2004700` (QRIS).

## Sources

- `https://docs.espay.id/api-mandatory/snap/signature`
- `https://docs.espay.id/pembayaran/direct-api/snap/payment-host-to-host`
- `https://docs.espay.id/pembayaran/direct-api/snap/qris`
