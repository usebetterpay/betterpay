# Nicepay SNAP Integration Research

**Scope:** Nicepay SNAP VA/QRIS/Payout. Sources: `docs.nicepay.co.id` (Firecrawl map 70+ URLs + scraped VA example). Checked 2026-08-02.

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/nicepay/api/v1.0/transfer-va/create-va` | Create VA |
| POST | `/nicepay/api/v1.0/transfer-va/inquiry` | Inquiry VA status |
| POST | `/nicepay/api/v1.0/qr/qr-mpm-generate` | Generate QRIS |
| POST | `/nicepay/api/v1.0/qr/qr-mpm-query` | Query QRIS |

Base: Dev `https://dev.nicepay.co.id`, Staging `https://staging.nicepay.co.id`, Prod `https://www.nicepay.co.id`.

## Headers

SNAP: `X-TIMESTAMP`, `X-SIGNATURE`, `X-PARTNER-ID`, `X-EXTERNAL-ID`, `CHANNEL-ID`. Same RSA-SHA256 formula as DOKU/Winpay/Espay.

## Signature

`stringToSign = HTTPMethod:EndpointUrl:Lowercase(Hex(SHA256(minify(body)))):Timestamp`, RSA-SHA256.

## VA Payload (Nicepay specific)

```json
{
  "partnerServiceId": "",
  "virtualAccountNo": "",
  "virtualAccountName": "Jhon Doe",
  "trxId": "2023123100000000000001",
  "totalAmount": { "value": "10000.00", "currency": "IDR" },
  "additionalInfo": {
    "bankCd": "BMRI",
    "goodsNm": "Jhon Doe",
    "dbProcessUrl": "https://...",
    "vacctValidDt": "20240307",
    "vacctValidTm": "150805"
  }
}
```

Response `2002700` success with `virtualAccountData.virtualAccountNo`.

## Sources

- `https://docs.nicepay.co.id/nicepay-api-snap`
- `https://docs.nicepay.co.id/nicepay-api-snap-testing-create-va`
