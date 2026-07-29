# DOKU SNAP Direct API — Virtual Account authentication research

**Scope:** Credentials and authentication for DOKU Direct API SNAP Virtual Account. Sources below are official DOKU developer documentation only. Checked 2026-07-29.

## Key conclusions

- **Client ID / API key:** In the SNAP documentation, the merchant identifier is the **Client-Id**. For the B2B token request it is sent as `X-CLIENT-KEY`; do not confuse this identifier with a secret signing key.
- **Secret Key versus RSA keys:** The SNAP flow uses an RSA key pair. The merchant's **private key** signs requests; the matching public key is used by the receiving party to verify them. A dashboard **Secret Key** is a separate credential and is not the private key; it is not the key used in the SNAP RSA-SHA256 formulas. Keep the private key and secret key server-side and never expose either to clients.
- **B2B token endpoint:** `POST /authorization/v1/access-token/b2b`, with a JSON body containing `grantType: "client_credentials"`. Sandbox and production full URLs are listed below. The response access token is used as `Authorization: Bearer <access_token>` for subsequent SNAP calls.
- **Token headers:** `Content-Type: application/json`, `X-TIMESTAMP` (ISO-8601 timestamp), `X-CLIENT-KEY` (Client ID), and `X-SIGNATURE` (the RSA signature). The signature input is `Client-Id + "|" + X-TIMESTAMP`; sign it with the merchant private key using RSA-SHA256 and Base64-encode the result.
- **SNAP request headers:** Transaction requests use `Authorization: Bearer ...`, `X-TIMESTAMP`, `X-SIGNATURE`, `X-PARTNER-ID`, `X-EXTERNAL-ID`, `CHANNEL-ID`, and `Content-Type: application/json` as applicable to the endpoint. `X-SIGNATURE` is generated over the HTTP method, relative path, access token, SHA-256 request-body digest, and timestamp—not with the Secret Key.
- **Request signature formula:**
  1. Minify the JSON body (no insignificant whitespace).
  2. `digest = lowercase(hex(SHA-256(minified_body)))`.
  3. `StringToSign = HTTPMethod + ":" + RelativePath + ":" + AccessToken + ":" + digest + ":" + X-TIMESTAMP`.
  4. `X-SIGNATURE = Base64(RSA-SHA256(merchant_private_key, StringToSign))`.
  The relative path must be the path sent to DOKU (for example, `/v1.0/transfer-va/create-va`), not the complete URL.
- **Sandbox versus production:** Use `https://api-sandbox.doku.com` for sandbox and `https://api.doku.com` for production. Credentials, keys, and tokens are environment-specific; do not mix them.
- **Webhook signature verification:** DOKU notifications carry `X-SIGNATURE` and `X-TIMESTAMP`. Verify the signature with the **DOKU public key** (not the merchant private key and not the Secret Key), using RSA-SHA256 over `Client-Id + "|" + X-TIMESTAMP`; Base64-decode the received signature before verification. Verify the raw request headers/body before parsing or reserializing JSON, and reject invalid or stale/replayed notifications according to the integration's timestamp policy.

## Endpoint and header reference

| Environment | B2B token URL |
|---|---|
| Sandbox | `https://api-sandbox.doku.com/authorization/v1/access-token/b2b` |
| Production | `https://api.doku.com/authorization/v1/access-token/b2b` |

Example token request shape (values are placeholders):

```http
POST /authorization/v1/access-token/b2b
Content-Type: application/json
X-TIMESTAMP: 2026-07-29T00:00:00+07:00
X-CLIENT-KEY: <client-id>
X-SIGNATURE: <base64-rsa-sha256-signature>

{"grantType":"client_credentials"}
```

For a Virtual Account operation, obtain a fresh valid B2B access token as required by its expiry, then send it in the Bearer header and calculate a request signature from the exact relative path and exact minified body. Preserve the original body bytes for any later troubleshooting or signature comparison.

## Official sources

- [DOKU Developers — API Authentication](https://developers.doku.com/get-started/api-authentication) — credentials, B2B access-token flow, signing formulas, and required SNAP headers.
- [DOKU Developers — Direct API / SNAP](https://developers.doku.com/accept-payment/direct-api/snap) — SNAP request conventions and authentication context.
- [DOKU Developers — Virtual Account](https://developers.doku.com/accept-payment/direct-api/snap/virtual-account) — Direct API SNAP VA integration and endpoint context.
- [DOKU Developers — B2B access token API reference](https://developers.doku.com/api-reference/authorization/access-token-b2b) — token endpoint, request headers, body, and response.
- [DOKU Developers — SNAP notification / webhook](https://developers.doku.com/get-started/webhook) — notification headers and public-key signature verification.
- [DOKU Developers — Security / signature](https://developers.doku.com/get-started/signature) — RSA-SHA256 signing and verification details.

> If the dashboard labels or endpoint-specific page differs from the generic authentication page, follow the endpoint-specific SNAP page for the current required header set; the credentials and signing key roles above remain distinct.
