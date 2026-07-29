# DOKU Provider Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `@betterpay/doku` for DOKU SNAP B2B BCA Virtual Account payments with RSA signing, token caching, status lookup, webhook normalization, tests, and docs.

**Architecture:** Follow the existing provider-package pattern. Keep cryptographic helpers, token caching, adapter behavior, and exports in focused files. Inject `fetch` for HTTP tests and use `node:crypto` for RSA/HMAC/SHA-256 operations.

**Tech Stack:** TypeScript, Node `crypto`, native `fetch`, Vitest, pnpm workspace, `@betterpay/core`.

## Global Constraints

- Use DOKU's documented SNAP B2B endpoint and headers.
- Use exact minified JSON bytes for body digests.
- Never log or expose credentials/tokens.
- Keep the provider framework-agnostic and compatible with `PaymentProvider`.
- Add tests before production code for every new behavior.
- Do not run live sandbox tests unless credentials are already available in environment variables.

---

### Task 1: Create package and cryptographic contract tests

**Files:**
- Create: `packages/doku/package.json`
- Create: `packages/doku/tsconfig.json`
- Create: `packages/doku/vitest.config.ts`
- Create: `packages/doku/__tests__/signature.test.ts`
- Create: `packages/doku/src/signature.ts`

**Interfaces:**
- Produce `createDokuTokenSignature(clientId, timestamp, privateKey): string`.
- Produce `createDokuTransactionSignature(method, path, body, accessToken, timestamp, privateKey): string`.
- Produce `sha256Hex(body): string`.

- [ ] Write tests for body minification/digest and RSA signatures using an in-test generated RSA key pair.
- [ ] Run `pnpm --filter @betterpay/doku test -- signature.test.ts`; verify it fails because the module is missing.
- [ ] Implement minimal helpers with `crypto.createSign('RSA-SHA256')` and exact DOKU formulas.
- [ ] Run the focused test and verify it passes.

### Task 2: Implement token cache with tests

**Files:**
- Create: `packages/doku/__tests__/token.test.ts`
- Create: `packages/doku/src/token.ts`

**Interfaces:**
- `DokuTokenClient({ clientId, privateKey, baseUrl, fetch, tokenSkewSeconds? })`.
- `getAccessToken(): Promise<string>`.

- [ ] Write tests for token request headers/body, token reuse, and refresh before expiry.
- [ ] Run focused tests and verify expected failures.
- [ ] Implement token request to `/authorization/v1/access-token/b2b`, cache expiry from `expiresIn`, and error handling for non-success responses.
- [ ] Run focused tests and verify they pass.

### Task 3: Implement adapter HTTP behavior

**Files:**
- Create: `packages/doku/__tests__/adapter.test.ts`
- Create: `packages/doku/src/adapter.ts`

**Interfaces:**
- Export `DokuConfig`.
- Export `dokuProvider(config): PaymentProvider & { priority?: number }`.
- Support `createPaymentLink`, `checkStatus`, `getApiEndpoint`.

- [ ] Write tests for BCA create request body/header mapping and `PaymentLinkResult` mapping.
- [ ] Write tests for status request and non-2xx/non-success response errors.
- [ ] Run focused tests and verify failures before implementation.
- [ ] Implement BCA VA create request using `/virtual-accounts/bi-snap-va/v1.1/transfer-va/create-va`, token cache, exact request signing, and response parsing.
- [ ] Implement status request using the documented DOKU SNAP VA status endpoint and response mapping.
- [ ] Run focused tests and verify they pass.

### Task 4: Implement webhook verification and normalization

**Files:**
- Modify: `packages/doku/src/signature.ts`
- Modify: `packages/doku/src/adapter.ts`
- Create: `packages/doku/__tests__/webhook.test.ts`

**Interfaces:**
- Export `verifyDokuWebhook(data, publicKey): boolean`.
- Adapter implements `verifyWebhook` and `normalizeWebhook`.

- [ ] Write tests for valid/invalid RSA webhook signatures, malformed payloads, and status mapping.
- [ ] Run focused tests and verify they fail for missing implementation.
- [ ] Implement verification using DOKU notification headers and preserve the raw body for signature checks.
- [ ] Map paid/success/completed to `payment.completed`, expired to `payment.expired`, failed to `payment.failed`, canceled to `payment.canceled`, otherwise `payment.pending`.
- [ ] Run focused tests and verify they pass.

### Task 5: Add plugin exports, package metadata, and docs

**Files:**
- Create: `packages/doku/src/index.ts`
- Create: `packages/doku/__tests__/plugin.test.ts`
- Modify: `README.md`
- Modify: `ARCHITECTURE.md`
- Modify: `docs/research/doku-snap-virtual-account-authentication.md` only if implementation findings require correction.

**Interfaces:**
- Export `doku(config): BetterPayPlugin`.
- Export adapter, config, signature helpers, and token types needed by consumers.

- [ ] Write plugin registration/export tests.
- [ ] Run focused tests and verify failure before implementation.
- [ ] Implement plugin metadata and error codes.
- [ ] Add DOKU to provider install examples, provider matrix, package list, and architecture provider table.
- [ ] Run focused tests and verify they pass.

### Task 6: Add optional live sandbox test and run full verification

**Files:**
- Create: `packages/doku/__tests__/e2e-http.test.ts`

- [ ] Add a skipped-by-default live test gated by `DOKU_CLIENT_ID`, `DOKU_PRIVATE_KEY`, and `DOKU_PARTNER_SERVICE_ID`.
- [ ] Run `pnpm --filter @betterpay/doku test`.
- [ ] Run `pnpm --filter @betterpay/doku build`.
- [ ] Run workspace `pnpm typecheck` and `pnpm build`.
- [ ] Run `pnpm lint` and inspect all changed files.
- [ ] Review `git diff` and report any unverified live-sandbox behavior honestly.
