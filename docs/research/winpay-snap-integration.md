# Winpay SNAP Integration Research

**Scope:** Winpay SNAP payment integration. Sources: `docs.winpay.id` (Firecrawl map 60+ URLs + scraped signature/VA/QRIS/callback docs). Checked 2026-07-31.

## Endpoints

| Method | Path | Service Code | Purpose |
|--------|------|-------------|---------|
| POST | `/v1.0/transfer-va/create-va` | 27 | Create Virtual Account |
| POST | `/v1.0/transfer-va/inquiry-va` | 30 | Inquiry VA |
| POST | `/v1.0/transfer-va/status` | 26 | Inquiry Status (paymentFlagStatus 00 paid, 01 unpaid) |
| DELETE | `/v1.0/transfer-va/delete-va` | 31 | Delete/Cancel VA |
| POST | `/v1.0/qr/qr-mpm-generate` | 47 | Generate QRIS MPM |
| POST | `/v1.0/qr/qr-mpm-query` | 51 | Query QRIS payment |
| POST | `/v1.0/qr/qr-mpm-cancel` | 77 | Cancel QRIS |

Base: Sandbox `https://sandbox-snap.winpay.id`, Production `https://snap.winpay.id`.

## Headers

| Header | Value | Notes |
|--------|-------|-------|
| X-TIMESTAMP | ISO8601 `YYYY-MM-DDTHH:mm:ss+07:00` | e.g. `2024-01-11T08:57:55+07:00` |
| X-SIGNATURE | Base64 RSA-SHA256 | See formula |
| X-PARTNER-ID | UUID / partnerId | Merchant key |
| X-EXTERNAL-ID | Numeric string unique per day | e.g. `1653199760` |
| CHANNEL-ID | e.g. `WEB` | Free value |

## Signature

Asymmetric Without Get Token (RSA-SHA256):

```
stringToSign = HTTPMethod + ":" + EndpointUrl + ":" + Lowercase(HexEncode(SHA-256(minify(RequestBody)))) + ":" + TimeStamp
X-SIGNATURE = base64_encode(SHA256withRSA(private_key, stringToSign))
```

For QRIS: same formula with `POST:/v1.0/qr/qr-mpm-generate:...`.

## Status Codes

- VA `paymentFlagStatus`: `00` paid/completed, `01` unpaid/pending, `02` check.
- QRIS `latestTransactionStatus`: `00` Success, `01` Initiated, `02` Paying, `03` Pending, `04` Refunded, `05` Canceled, `06` Failed, `07` Not found. Response `2002700`/`2004700` success.

## Callback

POST to merchant `{yoururl}/v1.0/transfer-va/payment` or `{yoururl}/v1.0/qr/qr-mpm-notify`. Headers include `X-TIMESTAMP`, `X-SIGNATURE` (signed by Winpay private key), `X-PARTNER-ID`. Verify with Winpay public key using same formula. Expected merchant response `{"responseCode":"2002500","responseMessage":"Successful"}` or `2005200` for QRIS. Retry 3x.

## Sources

- `https://docs.winpay.id/en/payments/snap-api/signature-generation`
- `https://docs.winpay.id/en/payments/snap-api/overview`
- `https://docs.winpay.id/en/payments/snap-api/virtual-account`
- `https://docs.winpay.id/en/payments/snap-api/qris`
- `https://docs.winpay.id/en/payments/snap-api/signature-callback-validation`
