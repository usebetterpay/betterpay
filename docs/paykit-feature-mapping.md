# PayKit → BetterPay: Complete Feature Mapping

> Exhaustive inventory of every feature in PayKit and how it maps to BetterPay.
> Setiap fitur PayKit di-catalog: what it does, how it works, and how we adapt it for multi-provider Indonesia.

---

## Feature Inventory

### Legend

| Status | Meaning |
|--------|---------|
| ✅ Mapped | Already documented in ARCHITECTURE.md |
| 🆕 Adapt | New feature to adopt — needs implementation |
| 🔄 Adapted | Adopted but modified for multi-provider / IDR |
| ⏭️ Skip | Not relevant for Indonesian market |
| ➕ Extend | Adopted + extended with new capabilities |

---

## 1. Core (`core/`)

| # | Feature | PayKit | Status | BetterPay Adaptation |
|---|---------|--------|:------:|---------------------|
| 1.1 | **`createPayKit()`** | Factory function → lazy context init, returns `PayKitInstance` | ✅ | → `betterPay()` — identical pattern. Lazy init, returns `PayInstance` |
| 1.2 | **PayKitContext** | `{ options, basePath, database, provider, products, logger }` | ✅ | → `PayContext` — expanded: adds `providerRegistry`, `notificationChannels`, `rateLimiter`, `hooks` |
| 1.3 | **`isPayKitInstance()`** | `Symbol.for("paykit.instance")` brand check | ✅ | → `isBetterPayInstance()` — identical |
| 1.4 | **Dev checks on startup** | `runDevChecks()` — dry-run product sync, pending migrations check | ✅ | → Same: warn if products out-of-sync, throw if migrations pending |
| 1.5 | **`globalThis` dedup** | `_global.__paykitDevChecksRan` prevents duplicate checks in HMR | 🆕 | → Same pattern for HMR-safe dev mode |
| 1.6 | **Error codes** | `defineErrorCodes()` with UPPER_SNAKE_CASE keys, type-safe | ✅ | → Identical pattern |
| 1.7 | **`PayKitError`** | Extends `APIError` from better-call | ✅ | → `BetterPayError` extends `APIError` |
| 1.8 | **Logger** | Pino + pino-pretty, AsyncLocalStorage trace, `logger.trace.run()` | ✅ | → Same: Pino + AsyncLocalStorage for request-scoped tracing |
| 1.9 | **ID generation** | `generateId(prefix, length=24)` using `webcrypto.getRandomValues`, base62 | ✅ | → Identical: `sub_xxx`, `ent_xxx`, `inv_xxx`, `pm_xxx`, `evt_xxx`, `prod_xxx` |
| 1.10 | **Options validation** | `assertValidPayKitOptions()` — legacy field detection, trustedOrigins validation | ✅ | → `assertValidBetterPayOptions()` + multi-provider validation |

---

## 2. Plan & Feature DSL (`types/schema.ts`)

| # | Feature | PayKit | Status | BetterPay Adaptation |
|---|---------|--------|:------:|---------------------|
| 2.1 | **`feature()`** | Factory: `feature({ id, type: "boolean" | "metered" })` → callable function with brand | ✅ | → Identical API |
| 2.2 | **`plan()`** | Factory: `plan({ id, group, name, price, default, includes })` → frozen branded object | ✅ | → Identical API. `price.amount` now IDR (bigint-ready) |
| 2.3 | **Feature types** | `"boolean"` (gated) and `"metered"` (usage-tracked) | ✅ | → Same + future: `"tiered"` (for阶梯 pricing) |
| 2.4 | **MeteredResetInterval** | `"day"`, `"week"`, `"month"`, `"year"` | ✅ | → Same |
| 2.5 | **Plan validation** | Zod schemas: `entityIdSchema` (lowercase alphanumeric + dash/underscore, max 64), `priceSchema` (positive, max 999,999.99) | 🔄 | → Adapt: max price = 999,999,999,999 (IDR can be large). Currency field added. |
| 2.6 | **`normalizeSchema()`** | Converts `PayKitPlan[]` → `NormalizedSchema` with sorted plans, features, planMap | ✅ | → Identical |
| 2.7 | **`computePlanHash()`** | SHA-256 of plan config → 16-char hex. Used to detect plan changes | ✅ | → Identical |
| 2.8 | **Symbol branding** | `Symbol.for("paykit.feature")`, `Symbol.for("paykit.plan")`, `Symbol.for("paykit.feature_include")` | ✅ | → `Symbol.for("betterpay.feature")`, etc. |
| 2.9 | **Type-safe inference** | `PlanIdFromProducts<T>`, `FeatureIdFromProducts<T>` — extract literal types from plan/feature definitions | ✅ | → Identical pattern |
| 2.10 | **`deriveNameFromId()`** | `"pro-plan"` → `"Pro Plan"` auto-name generation | ✅ | → Identical |

---

## 3. Provider Abstraction (`providers/provider.ts`)

| # | Feature | PayKit | Status | BetterPay Adaptation |
|---|---------|--------|:------:|---------------------|
| 3.1 | **`PaymentProvider` interface** | 20+ methods: createCustomer, createSubscription, handleWebhook, syncProducts, etc. | 🔄 | → Simplified to 3 required methods (`createPaymentLink`, `verifyWebhook`, `normalizeWebhook`) + optional methods |
| 3.2 | **Single provider** | `createPayKit({ stripe: {...} })` — one provider only | 🔄 | → Multi-provider: `betterPay({ plugins: [midtrans(...), xendit(...)] })` |
| 3.3 | **ProviderCustomer** | `{ id, frozenTime, testClockId, syncedEmail, syncedName, syncedMetadata }` | 🔄 | → Per-provider mapping table: `betterpay_customer_provider` |
| 3.4 | **ProviderSubscription** | `{ providerSubscriptionId, status, cancelAtPeriodEnd, currentPeriodStartAt/EndAt, ... }` | ✅ | → Same + per-provider mapping table |
| 3.5 | **ProviderInvoice** | `{ providerInvoiceId, totalAmount, currency, status, hostedUrl, periodStartAt/EndAt }` | ✅ | → Same |
| 3.6 | **ProviderPaymentMethod** | `{ providerMethodId, type, last4, expiryMonth, expiryYear, isDefault }` | ✅ | → Same + `subtype` field for VA bank, e-wallet brand |
| 3.7 | **ProviderSubscriptionResult** | `{ subscription, invoice, paymentUrl, requiredAction }` | 🔄 | → `{ paymentUrl, paymentCode, qrCodeUrl, providerData }` — Indo providers return different shapes |
| 3.8 | **ProviderRequiredAction** | `{ type, clientSecret, paymentIntentId }` — for Stripe 3DS | ⏭️ | → Skip (Indo providers don't have this). Replace with `redirectUrl` for e-wallet auth |
| 3.9 | **`createSubscriptionCheckout()`** | Stripe Checkout Session → hosted payment page | 🔄 | → `createPaymentLink()` — each provider has different payment link API |
| 3.10 | **`createPortalSession()`** | Stripe Customer Portal → self-service | ⏭️ | → Skip (Indo providers don't have portal). Build our own via `@betterpay/ui` |
| 3.11 | **`scheduleSubscriptionChange()`** | Stripe Subscription Schedules — change plan at period end | 🔄 | → Simulate internally: cancel current + schedule new at period end |
| 3.12 | **TunnelAccount / TunnelWebhook** | `getTunnelAccount()`, `ensureTunnelWebhook()`, `disableTunnelWebhook()` | 🆕 | → For `betterpay listen` CLI (webhook tunnel) |
| 3.13 | **`check()` diagnostics** | `{ ok, displayName, mode, webhookEndpoints, errors, customerSample }` | 🆕 | → Per-provider health check: connection test, webhook config, sandbox vs production |

---

## 4. Stripe Provider (`stripe/stripe-provider.ts`)

| # | Feature | PayKit Implementation | Status | BetterPay Adaptation |
|---|---------|----------------------|:------:|---------------------|
| 4.1 | **`createStripeAdapter()`** | Creates Stripe SDK client with version + retries | 🔄 | → Template for each provider: `createMidtransAdapter()`, `createXenditAdapter()`, etc. |
| 4.2 | **Stripe API version** | `"2025-10-29.clover"` — pinned version | 🔄 | → Each provider SDK version pinned |
| 4.3 | **`createCustomer()`** | `client.customers.create()` with test clock support | 🔄 | → Provider-specific customer creation |
| 4.4 | **`createSubscriptionCheckout()`** | `client.checkout.sessions.create({ mode: "subscription" })` | 🔄 | → Provider payment link API |
| 4.5 | **`createSubscription()` (direct)** | `client.subscriptions.create({ payment_behavior: "default_incomplete" })` | 🔄 | → Provider recurring API (if available) or payment link |
| 4.6 | **`updateSubscription()`** | `client.subscriptions.update()` with proration | 🔄 | → Provider-specific upgrade |
| 4.7 | **`cancelSubscription()`** | `client.subscriptions.update({ cancel_at_period_end: true })` + release schedule | 🔄 | → Provider-specific cancel |
| 4.8 | **`resumeSubscription()`** | Release schedule + `cancel_at_period_end: false` | 🔄 | → Internal: reactivate scheduled subscription |
| 4.9 | **`syncProducts()`** | `client.products.create()` + `client.prices.create()` | 🔄 | → Each provider has different product/price creation |
| 4.10 | **`createInvoice()`** | `client.invoices.create()` + `addLines()` + `finalizeInvoice()` | 🔄 | → Provider-specific invoice creation |
| 4.11 | **`handleWebhook()`** | `client.webhooks.constructEventAsync()` — HMAC-SHA256 verify | 🔄 | → Each provider has different signature verification |
| 4.12 | **Webhook event normalization** | Stripe events → NormalizedWebhookEvent[] (checkout.completed, subscription.updated, etc.) | ✅ | → Same pattern, per-provider |
| 4.13 | **Checkout expansion** | `createCheckoutCompletedEvents()` — fetches session + subscription + invoice + payment method details | 🔄 | → Per-provider post-payment expansion |
| 4.14 | **Test clock** | `client.testHelpers.testClocks.create()` + `advance()` + polling until `ready` | 🔄 | → Simulate internally for providers without test clock |
| 4.15 | **`ensureTunnelWebhook()`** | Creates/updates Stripe webhook endpoint for tunnel | 🆕 | → Per-provider webhook registration for tunnel |
| 4.16 | **`managedPayments`** | Stripe Managed Payments preview feature | ⏭️ | → Skip (Stripe-specific) |

---

## 5. Subscription Service (`subscription/subscription.service.ts`)

| # | Feature | PayKit | Status | BetterPay Adaptation |
|---|---------|--------|:------:|---------------------|
| 5.1 | **`subscribeToPlan()`** | Main entry point. Traces run, loads context, dispatches to handler | ✅ | → Same pattern |
| 5.2 | **`loadSubscribeContext()`** | Resolves plan, product, customer, provider customer, active sub, scheduled subs, upgrade/downgrade | ✅ | → Same |
| 5.3 | **Same plan handler** | Resume if pending cancel, else noop | ✅ | → Same |
| 5.4 | **Initial subscribe** | Free: direct activate. Paid: checkout or direct subscription | 🔄 | → Free: same. Paid: payment link or provider recurring |
| 5.5 | **Local plan switch** | Replace local-only subscription (no provider involvement) | ✅ | → Same |
| 5.6 | **Cancel to free** | Cancel provider sub + schedule free plan at period end | 🔄 | → Cancel provider payment link + schedule free |
| 5.7 | **Scheduled downgrade** | Schedule cheaper plan at period end via provider | 🔄 | → Internal schedule: cancel at end + create scheduled sub |
| 5.8 | **Upgrade** | Immediate provider subscription update | 🔄 | → Provider-specific upgrade or new payment link |
| 5.9 | **Checkout-based subscribe** | `createSubscriptionCheckout()` → redirect to provider hosted page | 🔄 | → `createPaymentLink()` → redirect to provider/payment page |
| 5.10 | **Checkout completion** | `prepareSubscribeCheckoutCompleted()` + `applyCheckoutSubscription()` — validates metadata, cancels old sub, creates new | 🔄 | → Same pattern via webhook: validate metadata, reconcile |
| 5.11 | **`insertSubscriptionRecord()`** | Insert subscription + entitlements in one go | ✅ | → Same |
| 5.12 | **`endSubscriptions()`** | Batch update status to ended/canceled | ✅ | → Same |
| 5.13 | **Scheduled subscription management** | `getScheduledSubscriptionsInGroup()`, `clearScheduledSubscriptionsInGroup()`, `deleteScheduledSubscriptionsInGroup()` | ✅ | → Same |
| 5.14 | **`activateScheduledSubscription()`** | Flip scheduled → active | ✅ | → Same |
| 5.15 | **`activateScheduledSubscriptionForGroup()`** | Find matching scheduled sub, end active, activate scheduled | ✅ | → Same |
| 5.16 | **`ensureScheduledDefaultPlan()`** | Auto-create scheduled default plan sub if no scheduled exists in group | ✅ | → Same |
| 5.17 | **Duplicate active subscription warning** | `warnOnDuplicateActiveSubscriptionGroups()` — detect + log | ✅ | → Same |
| 5.18 | **`syncSubscriptionFromProvider()`** | Sync provider state back to local DB | ✅ | → Same |
| 5.19 | **`syncSubscriptionBillingState()`** | Sync period dates, Stripe IDs, status | 🔄 | → Sync period dates, provider IDs, status |
| 5.20 | **`addResetInterval()`** | Date math for entitlement reset (day/week/month/year with clamping) | ✅ | → Identical |
| 5.21 | **`SubscriptionWithCatalog`** | Joined type: subscription + product info (planId, priceAmount, etc.) | ✅ | → Same |

---

## 6. Entitlement Engine (`entitlement/entitlement.service.ts`)

| # | Feature | PayKit | Status | BetterPay Adaptation |
|---|---------|--------|:------:|---------------------|
| 6.1 | **`checkEntitlement()`** | Read-only: get active entitlements, lazy-reset stale, aggregate balance | ✅ | → Identical |
| 6.2 | **`reportEntitlement()`** | Deduct usage: single CTE query, fast path (one row covers amount) | ✅ | → Identical |
| 6.3 | **`reportEntitlementStacked()`** | Fallback: `FOR UPDATE` lock, greedy deduct across multiple entitlement rows | ✅ | → Identical |
| 6.4 | **`getActiveEntitlements()`** | JOIN entitlement + subscription + productFeature, filter active subs | ✅ | → Identical |
| 6.5 | **`resetStaleEntitlements()`** | Batch `UPDATE ... CASE WHEN` for lazy reset | ✅ | → Identical |
| 6.6 | **`aggregateBalance()`** | Sum balances, detect unlimited, find earliest reset | ✅ | → Identical |
| 6.7 | **`getNextResetAt()`** | Loop `addResetInterval` until `> now` | ✅ | → Identical |
| 6.8 | **`EntitlementBalance`** | `{ limit, remaining, resetAt, unlimited }` | ✅ | → Same |
| 6.9 | **`CheckResult`** | `{ allowed, balance }` | ✅ | → Same |
| 6.10 | **`ReportResult`** | `{ success, balance }` | ✅ | → Same |
| 6.11 | **Test clock awareness** | `getCustomerCurrentTime()` — uses frozen time if test clock active | 🆕 | → Same pattern |

---

## 7. Customer Service (`customer/customer.service.ts`)

| # | Feature | PayKit | Status | BetterPay Adaptation |
|---|---------|--------|:------:|---------------------|
| 7.1 | **`syncCustomer()`** | Upsert customer in DB | ✅ | → Same |
| 7.2 | **`upsertCustomer()`** | Sync + ensure default plans + optionally create provider customer | ✅ | → Same |
| 7.3 | **`ensureDefaultPlansForCustomer()`** | Auto-assign free default plans on customer creation | ✅ | → Same |
| 7.4 | **`getCustomerWithDetails()`** | JOIN customer + subscriptions + entitlements → `CustomerWithDetails` | ✅ | → Same |
| 7.5 | **`getProviderCustomer()`** | Read provider mapping from customer row | 🔄 | → Read from `betterpay_customer_provider` table |
| 7.6 | **`setProviderCustomer()`** | Write provider mapping to customer row | 🔄 | → Write to `betterpay_customer_provider` table |
| 7.7 | **`upsertProviderCustomer()`** | Create or update provider customer + sync email/name/metadata | 🔄 | → Same but multi-provider aware |
| 7.8 | **`providerCustomerNeedsSync()`** | Compare synced vs current email/name/metadata | ✅ | → Same |
| 7.9 | **`findCustomerByProviderCustomerId()`** | Reverse lookup: Stripe customer ID → local customer | 🔄 | → Lookup via `betterpay_customer_provider` |
| 7.10 | **`hardDeleteCustomer()`** | Cancel provider subs + delete provider customer + delete all local records | 🔄 | → Cancel all provider payment links + delete all records |
| 7.11 | **`deleteCustomerFromDatabase()`** | Cascade delete: entitlements, subscriptions, invoices, payment methods, customer | ✅ | → Same |
| 7.12 | **`emitCustomerUpdated()`** | Fire `customer.updated` event to user-defined handlers | ✅ | → Same |
| 7.13 | **`listCustomers()`** | Paginated list with plan filter, joined subscriptions + entitlements | ✅ | → Same |
| 7.14 | **`appendEntitlement()`** | Aggregate entitlements across multiple subscriptions (stacking) | ✅ | → Same |
| 7.15 | **`stableStringify()`** | Deterministic JSON for metadata comparison | ✅ | → Same |
| 7.16 | **Customer Portal** | `customerPortal()` — opens Stripe billing portal | ⏭️ | → Skip. Build self-hosted portal via `@betterpay/ui` |
| 7.17 | **`CustomerWithDetails`** | Customer + subscriptions[] + entitlements{} | ✅ | → Same |
| 7.18 | **`ListCustomersResult`** | `{ data, total, hasMore, limit, offset }` | ✅ | → Same |

---

## 8. Product Service (`product/product.service.ts` + `product-sync.service.ts`)

| # | Feature | PayKit | Status | BetterPay Adaptation |
|---|---------|--------|:------:|---------------------|
| 8.1 | **`upsertFeature()`** | Insert or update feature in DB | ✅ | → Same |
| 8.2 | **`getLatestProduct()`** | Get latest version of a product by ID | ✅ | → Same |
| 8.3 | **`getProductByHash()`** | Find product by ID + hash (plan config fingerprint) | ✅ | → Same |
| 8.4 | **`getProductByInternalId()`** | Lookup by internal_id | ✅ | → Same |
| 8.5 | **`insertProductVersion()`** | Create new product version (immutable versioning) | ✅ | → Same |
| 8.6 | **`updateProductName()`** | Update name without new version | ✅ | → Same |
| 8.7 | **`replaceProductFeatures()`** | Delete + re-insert product_feature rows | ✅ | → Same |
| 8.8 | **`getProviderProduct()`** | Read Stripe product/price IDs | 🔄 | → Read from `betterpay_product_provider` |
| 8.9 | **`upsertProviderProduct()`** | Write Stripe product/price IDs | 🔄 | → Write to `betterpay_product_provider` |
| 8.10 | **`getDefaultProductInGroup()`** | Find default plan in group | ✅ | → Same |
| 8.11 | **`getProductByProviderData()`** | Reverse lookup: Stripe product/price ID → local product | 🔄 | → Lookup via `betterpay_product_provider` |
| 8.12 | **`syncProducts()`** | Full sync: features → products → provider products | 🔄 | → Multi-provider: sync to ALL registered providers |
| 8.13 | **`dryRunSyncProducts()`** | Dry run: what would change without actually syncing | ✅ | → Same |
| 8.14 | **`planChanged()`** | Compare existing vs next plan (group, default, price, features) | ✅ | → Same |
| 8.15 | **`featuresChanged()`** | Compare feature arrays (id, limit, resetInterval, config) | ✅ | → Same |
| 8.16 | **`withProviderInfo()`** | Attach provider product IDs to stored product | 🔄 | → Multi-provider: attach all provider IDs |
| 8.17 | **Product versioning** | `version` integer, auto-increment on change | ✅ | → Same |

---

## 9. Webhook Pipeline (`webhook/webhook.service.ts`)

| # | Feature | PayKit | Status | BetterPay Adaptation |
|---|---------|--------|:------:|---------------------|
| 9.1 | **`handleWebhook()`** | Entry point: provider parse → process each event | ✅ | → Same, but route to correct provider by `:provider` param |
| 9.2 | **`processWebhookEvent()`** | Per-event: begin → prepare → transaction → emit → finish | ✅ | → Same |
| 9.3 | **`beginWebhookEvent()`** | Idempotency: INSERT webhook_event, catch unique violation → retry failed after 5 min | ✅ | → Same |
| 9.4 | **`finishWebhookEvent()`** | Mark processed/failed | ✅ | → Same |
| 9.5 | **`applyAction()`** | Dispatch action type → service function | ✅ | → Same |
| 9.6 | **`getProviderEventId()`** | Extract or generate event ID (parent:sub-events for synthetic events) | ✅ | → Same |
| 9.7 | **`getParentProviderEventId()`** | Find parent event ID from batch | ✅ | → Same |
| 9.8 | **Transaction wrapping** | All DB mutations in single transaction | ✅ | → Same |
| 9.9 | **Customer updated emission** | After transaction, emit `customer.updated` for each affected customer | ✅ | → Same |

---

## 10. Invoice Service (`invoice/invoice.service.ts`)

| # | Feature | PayKit | Status | BetterPay Adaptation |
|---|---------|--------|:------:|---------------------|
| 10.1 | **`upsertInvoiceRecord()`** | Insert or update invoice by provider invoice ID | ✅ | → Same, multi-provider aware |
| 10.2 | **`applyInvoiceWebhookAction()`** | Process `invoice.upsert` action from webhook | ✅ | → Same |

---

## 11. Payment Service (`payment/payment.service.ts`)

| # | Feature | PayKit | Status | BetterPay Adaptation |
|---|---------|--------|:------:|---------------------|
| 11.1 | **`syncPaymentByProviderCustomer()`** | Insert or update payment record by provider payment ID | ✅ | → Same |
| 11.2 | **`applyPaymentWebhookAction()`** | Process `payment.upsert` action from webhook | ✅ | → Same |

---

## 12. Payment Method Service (`payment-method/payment-method.service.ts`)

| # | Feature | PayKit | Status | BetterPay Adaptation |
|---|---------|--------|:------:|---------------------|
| 12.1 | **`getDefaultPaymentMethod()`** | Find customer's default payment method | ✅ | → Same |
| 12.2 | **`syncPaymentMethodByProviderCustomer()`** | Upsert payment method, clear old default if new is default | ✅ | → Same + `subtype` field |
| 12.3 | **`deletePaymentMethodByProviderId()`** | Soft-delete (set `deletedAt`, clear default) | ✅ | → Same |
| 12.4 | **`applyPaymentMethodWebhookAction()`** | Process `payment_method.upsert` and `payment_method.delete` actions | ✅ | → Same |

---

## 13. Testing (`testing/testing.service.ts` + `testing.api.ts`)

| # | Feature | PayKit | Status | BetterPay Adaptation |
|---|---------|--------|:------:|---------------------|
| 13.1 | **`getCustomerTestClock()`** | Get test clock from provider, update frozen time in DB | 🆕 | → Simulate internally: store frozen time in customer table |
| 13.2 | **`getCustomerCurrentTime()`** | Return frozen time if test clock active, else `new Date()` | 🆕 | → Same pattern |
| 13.3 | **`advanceCustomerTestClock()`** | Advance provider test clock + update DB | 🆕 | → Simulate: advance time, trigger renewals + resets + invoices |
| 13.4 | **Testing API endpoints** | `getTestClock`, `advanceTestClock` — gated by `testing.enabled` | 🆕 | → Same, plus additional endpoints for billing simulation |
| 13.5 | **Test key assertion** | `assertStripeTestKey()` — require `sk_test_` prefix | 🔄 | → Per-provider test key validation |

---

## 14. Client SDK (`client/index.ts`)

| # | Feature | PayKit | Status | BetterPay Adaptation |
|---|---------|--------|:------:|---------------------|
| 14.1 | **`createPayKitClient()`** | Proxy-based client, converts method calls to HTTP POST | ✅ | → `createPayClient()` — same proxy pattern |
| 14.2 | **Base URL resolution** | `${baseURL}/api` with trailing slash cleanup | ✅ | → Same |
| 14.3 | **Credentials handling** | `credentials: "include"` for cookie-based auth | ✅ | → Same |
| 14.4 | **Type inference** | `InferClientAPI<Instance>` — extract API shape from server type | ✅ | → Same pattern |
| 14.5 | **Path mapping** | `camelCase` → `kebab-case` path conversion | ✅ | → Same |
| 14.6 | **Proxy method detection** | Block `then`/`catch`/`finally` to prevent Promise confusion | ✅ | → Same |

---

## 15. API Layer (`api/define-route.ts` + `api/methods.ts`)

| # | Feature | PayKit | Status | BetterPay Adaptation |
|---|---------|--------|:------:|---------------------|
| 15.1 | **`createPayKitEndpoint()`** | better-call `createEndpoint` with PayContext middleware | ✅ | → `createPayEndpoint()` — same |
| 15.2 | **`definePayKitMethod()`** | Wraps service function as both API endpoint and direct-call method | ✅ | → Same pattern |
| 15.3 | **`returnUrl()`** | Branded Zod URL schema for return URLs | ✅ | → Same |
| 15.4 | **Return URL normalization** | Resolve relative paths to absolute URLs using request origin | ✅ | → Same |
| 15.5 | **`trustedOrigins` validation** | Assert resolved origin is in allowlist | ✅ | → Same |
| 15.6 | **Customer resolution** | `resolveCustomer()` — identify from request or explicit ID | ✅ | → Same |
| 15.7 | **Customer ID mismatch check** | If identify returns different ID than explicit → FORBIDDEN | ✅ | → Same |
| 15.8 | **`createPayKitRouter()`** | better-call `createRouter` with merged core + plugin endpoints | ✅ | → Same |
| 15.9 | **URL normalization** | Rewrite legacy `/api/webhook` → `/webhook`, `/api/*` → `/*`, GET → dashboard | ✅ | → Same |
| 15.10 | **Client method filtering** | `pickMethods()` — only expose `client: true` methods | ✅ | → Same |
| 15.11 | **Method wrapping** | `wrapMethods()` — inject context, expose endpoint metadata | ✅ | → Same |
| 15.12 | **Testing method gating** | `isTestingEnabled()` → include/exclude test methods | ✅ | → Same |

---

## 16. CLI (`cli/`)

| # | Feature | PayKit | Status | BetterPay Adaptation |
|---|---------|--------|:------:|---------------------|
| 16.1 | **`paykitjs init`** | Interactive setup: detect framework, generate config + route handler + client + plans | 🆕 | → `betterpay init` — same, but with provider selection (Midtrans/Xendit/DOKU) |
| 16.2 | **Framework detection** | Auto-detect Next.js, Nuxt, SvelteKit, Remix, Astro, Hono, Express, etc. (13 frameworks) | 🆕 | → Same framework list |
| 16.3 | **Config generation** | Generate `paykit.ts` with Stripe config, products import, identify callback | 🆕 | → Generate `billing.ts` with provider plugins |
| 16.4 | **Route handler generation** | Generate framework-specific route file (`[...slug]/route.ts`, etc.) | 🆕 | → Same per-framework templates |
| 16.5 | **Client file generation** | Generate `paykit-client.ts` with type-safe client | 🆕 | → Generate `pay-client.ts` |
| 16.6 | **Plan templates** | "SaaS Starter", "Usage Based", "Empty" | 🆕 | → Same + IDR-specific: "Indonesian SaaS", "QRIS Starter" |
| 16.7 | **Env file management** | Detect/create `.env`, add missing vars | 🆕 | → Same, but with provider-specific env vars (MIDTRANS_SERVER_KEY, etc.) |
| 16.8 | **`paykitjs push`** | Apply migrations + sync products to DB + provider | 🆕 | → `betterpay push` — sync to ALL registered providers |
| 16.9 | **`paykitjs status`** | Check config, DB, provider connection, migrations, product sync, webhook endpoints | 🆕 | → `betterpay status` — check ALL providers |
| 16.10 | **`paykitjs listen`** | Webhook tunnel: cloud relay → WebSocket → local forward | 🆕 | → `betterpay listen` — multi-provider tunnel |
| 16.11 | **Preflight checks** | Before push: validate provider connection, check customer conflicts | 🆕 | → Per-provider preflight |
| 16.12 | **Update check** | Check if newer version available, suggest upgrade | 🆕 | → Same |
| 16.13 | **Config file resolution** | Search 14 config filenames × 9 directories | 🆕 | → Same pattern |
| 16.14 | **jiti module loading** | TypeScript config loading with path alias resolution | 🆕 | → Same |
| 16.15 | **Device token** | Persistent device token for tunnel auth | 🆕 | → Same |
| 16.16 | **Telemetry** | Anonymous CLI usage tracking (PostHog) | 🆕 | → Same (opt-out) |

---

## 17. Handler (`handlers/next.ts`)

| # | Feature | PayKit | Status | BetterPay Adaptation |
|---|---------|--------|:------:|---------------------|
| 17.1 | **`paykitHandler()`** | Returns `{ GET, POST }` for Next.js App Router | ✅ | → `@betterpay/next` — same + Hono, Express, Fastify, Bun, etc. |

---

## 18. Database (`database/`)

| # | Feature | PayKit | Status | BetterPay Adaptation |
|---|---------|--------|:------:|---------------------|
| 18.1 | **`pgTableCreator`** | Prefix all tables with `paykit_` | 🔄 | → Prefix with `betterpay_` |
| 18.2 | **Schema tables** | customer, payment_method, feature, product, product_feature, subscription, entitlement, invoice, metadata, webhook_event | 🔄 | → Same + payment, customer_provider, subscription_provider, product_provider, notification_log, settlement |
| 18.3 | **Migrations** | Sequential SQL migrations with drizzle-kit | ✅ | → Same pattern |
| 18.4 | **Migration 0000_init** | Generic provider JSONB schema | ⏭️ | → Skip (we start with dedicated columns) |
| 18.5 | **Migration 0001_stripe_only** | Flatten JSONB → dedicated Stripe columns | ⏭️ | → Skip (we start multi-provider from day 1) |
| 18.6 | **`createDatabase()`** | `drizzle(pool, { schema })` | ✅ | → Via adapter factory |
| 18.7 | **`migrateDatabase()`** | `migrate(drizzle, { migrationsFolder, migrationsTable })` | ✅ | → Same |
| 18.8 | **`getPendingMigrationCount()`** | Compare journal entries vs applied migrations | ✅ | → Same |
| 18.9 | **Timestamp helpers** | `createdAt`, `updatedAt` with `$defaultFn`, `$onUpdateFn` | ✅ | → Same |

---

## 19. Options (`types/options.ts`)

| # | Feature | PayKit | Status | BetterPay Adaptation |
|---|---------|--------|:------:|---------------------|
| 19.1 | **`PayKitOptions`** | `{ database, stripe, products, basePath, trustedOrigins, identify, on, plugins, logging, testing }` | 🔄 | → `{ database, products, basePath, trustedOrigins, identify, on, plugins, logging, testing, secondaryStorage, rateLimit, databaseHooks }` |
| 19.2 | **`database: Pool | string`** | Accept pg Pool or connection string | ✅ | → Same + adapter factory |
| 19.3 | **`basePath`** | URL prefix (default `/paykit`) | ✅ | → Same (default `/pay`) |
| 19.4 | **`identify`** | `(request) => Promise<{ customerId, email, name } | null>` | ✅ | → Same |
| 19.5 | **`on`** | Event handlers: `customer.updated`, `*` wildcard | ✅ | → Same + `payment.succeeded`, `invoice.paid`, `subscription.renewed` |
| 19.6 | **`plugins`** | `PayKitPlugin[]` | ✅ | → Same (expanded interface) |
| 19.7 | **`logging`** | `{ level, logger }` — Pino config | ✅ | → Same |
| 19.8 | **`testing`** | `{ enabled: true }` — enables test clock endpoints | ✅ | → Same |
| 19.9 | **`ExactOptions`** | Prevent extra keys in options object | ✅ | → Same |

---

## 20. Events (`types/events.ts`)

| # | Feature | PayKit | Status | BetterPay Adaptation |
|---|---------|--------|:------:|---------------------|
| 20.1 | **`NormalizedWebhookEventMap`** | 7 event types: checkout.completed, payment_method.attached, payment.succeeded, subscription.updated, subscription.deleted, invoice.updated, payment_method.detached | 🔄 | → Same + `payment.failed`, `payment.expired`, `refund.succeeded` |
| 20.2 | **`WebhookApplyAction`** | 6 action types: payment_method.upsert/delete, payment.upsert, subscription.upsert/delete, invoice.upsert | ✅ | → Same + `refund.upsert` |
| 20.3 | **`PayKitEventMap`** | User-facing events: `customer.updated` | ✅ | → Same + more events |
| 20.4 | **`PayKitEventHandlers`** | Named handlers + `*` wildcard | ✅ | → Same |

---

## 21. Utilities (`utilities/dependencies/`)

| # | Feature | PayKit | Status | BetterPay Adaptation |
|---|---------|--------|:------:|---------------------|
| 21.1 | **Dependency checker** | `checkPayKitDependencies()` — verify installed package versions match expected | 🆕 | → `checkBetterPayDependencies()` — same pattern |
| 21.2 | **Package list** | `PAYKIT_PACKAGE_LIST` — known packages + expected versions | 🆕 | → `BETTERPAY_PACKAGE_LIST` |
| 21.3 | **Dependency detection** | `getDependencies()` — scan package.json for installed deps | 🆕 | → Same |

---

## Summary Statistics

| Category | Total | ✅ Mapped | 🔄 Adapted | 🆕 Adopt | ⏭️ Skip | ➕ Extend |
|----------|:-----:|:---------:|:----------:|:--------:|:-------:|:---------:|
| Core | 10 | 8 | 2 | 0 | 0 | 0 |
| Plan/Feature DSL | 10 | 9 | 1 | 0 | 0 | 0 |
| Provider Abstraction | 13 | 3 | 7 | 2 | 2 | 0 |
| Stripe Provider | 16 | 1 | 12 | 1 | 2 | 0 |
| Subscription | 21 | 13 | 6 | 0 | 0 | 2 |
| Entitlement | 11 | 11 | 0 | 0 | 0 | 0 |
| Customer | 18 | 11 | 4 | 0 | 1 | 2 |
| Product | 17 | 12 | 4 | 0 | 0 | 1 |
| Webhook | 9 | 9 | 0 | 0 | 0 | 0 |
| Invoice | 2 | 2 | 0 | 0 | 0 | 0 |
| Payment | 2 | 2 | 0 | 0 | 0 | 0 |
| Payment Method | 4 | 4 | 0 | 0 | 0 | 0 |
| Testing | 5 | 0 | 1 | 4 | 0 | 0 |
| Client SDK | 6 | 6 | 0 | 0 | 0 | 0 |
| API Layer | 12 | 12 | 0 | 0 | 0 | 0 |
| CLI | 16 | 0 | 0 | 16 | 0 | 0 |
| Handler | 1 | 1 | 0 | 0 | 0 | 0 |
| Database | 9 | 4 | 2 | 0 | 2 | 1 |
| Options | 9 | 7 | 1 | 0 | 0 | 1 |
| Events | 4 | 2 | 2 | 0 | 0 | 0 |
| Utilities | 3 | 0 | 0 | 3 | 0 | 0 |
| **TOTAL** | **182** | **117** | **42** | **26** | **7** | **7** |

---

## Features to Skip (and Why)

| # | Feature | Reason to Skip |
|---|---------|---------------|
| 3.8 | `ProviderRequiredAction` (Stripe 3DS) | Indo providers don't use 3DS. Replace with redirectUrl for e-wallet auth flows. |
| 3.10 | Stripe Customer Portal | Indo providers don't have hosted portals. Build self-hosted via `@betterpay/ui` billing portal component. |
| 4.16 | Stripe Managed Payments | Stripe-specific preview feature |
| 18.4 | Migration 0000_init (JSONB schema) | We start with dedicated columns, not generic JSONB |
| 18.5 | Migration 0001_stripe_only (flatten JSONB) | Not needed — we never had JSONB |
| 7.16 | `customerPortal()` API | Same as 3.10 — build our own |

## Features to Extend

| # | Feature | Extension |
|---|---------|-----------|
| 5.21 | `SubscriptionWithCatalog` | + `providerId`, `paymentMethod`, `paymentCode` (VA number, QRIS code) |
| 7.17 | `CustomerWithDetails` | + `phone`, `paymentMethods[]`, `invoices[]` |
| 8.16 | `withProviderInfo()` | Returns ALL provider IDs, not just one |
| 18.2 | Database schema | + `betterpay_payment`, `betterpay_customer_provider`, `betterpay_notification_log`, `betterpay_settlement` |
| 19.1 | Options | + `secondaryStorage`, `rateLimit`, `databaseHooks` |
| 20.1 | NormalizedWebhookEventMap | + `payment.failed`, `payment.expired`, `refund.succeeded` |
| 17.1 | Framework handlers | + Hono, Express, Fastify, Bun, Elysia, Nuxt, SvelteKit, Remix, Astro |

---

*182 PayKit features inventoried. 159 adopted (mapped/adapted/new), 7 skipped, 7 extended.*
*Date: 2026-06-10*
