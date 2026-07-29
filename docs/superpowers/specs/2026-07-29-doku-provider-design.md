# DOKU Provider Design

## Goal

Add `@betterpay/doku`, a BetterPay provider plugin for DOKU SNAP B2B Virtual Account, initially targeting the BCA VA create flow available in DOKU sandbox.

## Scope

- DOKU SNAP B2B access-token acquisition with RSA-SHA256 signing.
- Short-lived in-memory access-token cache with expiry handling.
- BCA Virtual Account create flow using the DOKU Generated Payment Code mode by default, with merchant-generated VA fields configurable.
- Transaction request signing using the configured asymmetric RSA private key.
- Status lookup using the DOKU SNAP VA status endpoint documented for the provider.
- Webhook signature verification and payload normalization for DOKU SNAP notifications.
- BetterPay provider/plugin exports, package metadata, unit tests, HTTP contract tests with mocked `fetch`, optional sandbox E2E test, and provider documentation.

## Configuration

```ts
interface DokuConfig {
  clientId: string;
  privateKey: string;
  clientSecret?: string;
  isSandbox?: boolean;
  priority?: number;
  partnerServiceId?: string;
  channelId?: string;
  vaBank?: 'BCA';
  tokenSkewSeconds?: number;
  fetch?: typeof globalThis.fetch;
}
```

The private key is required for the SNAP asymmetric flow. `clientSecret` is retained as an optional field for documented symmetric endpoints but is not used by the initial asymmetric BCA VA flow.

## Architecture

The package follows the existing provider package pattern:

- `src/signature.ts`: timestamp, body digest, token signature, transaction signature, and webhook verification helpers.
- `src/token.ts`: token response parsing and expiry-aware cache.
- `src/adapter.ts`: `PaymentProvider` implementation, BCA VA request construction, status request, webhook parsing, and canonical status mapping.
- `src/index.ts`: public exports and BetterPay plugin factory.

The provider uses dependency-injected `fetch` for deterministic HTTP tests and selects `api-sandbox.doku.com` or `api.doku.com` based on `isSandbox`.

## Data Flow

1. `createPaymentLink` validates input through the existing BetterPay service.
2. The provider gets a cached B2B token, requesting one when absent or near expiry.
3. It constructs the exact minified JSON body and endpoint path.
4. It signs the token and transaction requests according to DOKU's documented formulas.
5. It sends the request with the SNAP headers and maps the response to `PaymentLinkResult`.
6. `checkStatus` obtains a token, sends the documented status request, and maps the response to `StatusResult`.
7. `verifyWebhook` validates DOKU's notification signature using configured verification material and rejects malformed/invalid requests.
8. `normalizeWebhook` maps DOKU notification statuses to BetterPay event names and preserves the original payload.

## Error Handling

- Non-2xx responses include HTTP status and response body in thrown errors.
- DOKU responses with non-success response codes throw provider errors rather than returning an empty transaction.
- Missing required response identifiers are treated as errors.
- Invalid JSON or malformed webhook payloads return no normalized events.
- Signature helpers use constant-time comparison where applicable.
- Tokens are never logged or included in normalized webhook payloads.

## Testing

- Signature vectors verify exact RSA token and transaction signing inputs, body minification, and digest casing.
- Token cache tests verify reuse and refresh before expiry.
- Adapter HTTP tests verify endpoint, headers, body, response mapping, and error behavior using mocked fetch.
- Webhook tests verify valid, invalid, and malformed notifications.
- Plugin export tests verify provider registration and package API.
- A skipped live sandbox test runs only when DOKU credentials and key material are present in environment variables.

## Documentation Sources

- https://developers.doku.com/accept-payments/direct-api/snap/integration-guide/get-token-api/b2b
- https://developers.doku.com/accept-payments/direct-api/snap/integration-guide/virtual-account/bca-virtual-account
- https://developers.doku.com/get-started-with-doku-api/signature-component/snap/asymmetric-signature
- https://developers.doku.com/get-started-with-doku-api/retrieve-payment-credential
- `docs/research/doku-snap-virtual-account-authentication.md`

The Playwright inspection of the official DOKU sandbox demo (2026-07-29) confirms that the current demo uses `/virtual-accounts/bi-snap-va/v1/transfer-va/create-va`; the adapter follows this live demo path.
