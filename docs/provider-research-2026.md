# Indonesian Payment Gateway Research (June 2026)

> Deep research data from Exa — provider pricing, APIs, regulations, QRIS developments.
> All data verified from primary sources (BI, provider docs, Baker McKenzie analysis).

---

## 1. Provider Pricing Comparison (2026)

| Method | Midtrans | Xendit | DOKU | Duitku |
|--------|----------|--------|------|--------|
| Credit Card (local) | 2.9% + Rp 2,000 | 2.9% + Rp 2,500 | Custom (negotiated) | 2.9% + Rp 2,000 |
| Credit Card (intl) | 3.8% + Rp 2,000 | 3.8% + Rp 2,000 | Custom | N/A |
| Virtual Account | Rp 4,000/txn | Rp 4,000/txn | Rp 3,500–4,500/txn | Rp 4,000/txn |
| E-Wallet (GoPay, OVO, DANA, ShopeePay) | 1.5–2% | 1.5–2% | Custom | 1.67% |
| QRIS | 0.7% | 0.7% | 0.7% | 0.7% |
| Retail (Alfamart/Indomaret) | Rp 6,000/txn | Rp 5,000/txn | Custom | N/A |
| Setup fee | Free | Free | Custom (may have) | Free |
| Monthly fee | None | None | Custom | None |
| Settlement | T+1 to T+3 | T+1 to T+2 (T+0 instant available) | T+1 to T+5 | T+1 to T+2 |
| Chargeback fee | Rp 50K–150K | USD 15 (~Rp 230K) | Rp 100K–200K | N/A |

### Volume Discounts
- **Xendit**: Published tiered structure, fees drop with monthly volume
- **Midtrans**: Case-by-case negotiation, starts at published rates
- **DOKU**: Enterprise custom, can be 20-40% lower for >IDR 1B/month volume
- **Duitku**: Flat rates, no published discount tiers

### Recommendation for BetterPay
Default to **Xendit** for SaaS/startups (best DX, built-in recurring). Use **Midtrans** for e-commerce (Snap checkout). Use **DOKU** for enterprise (custom rates). **Duitku** for VA-heavy use cases (most bank coverage).

---

## 2. Subscription/Recurring Capabilities

### Midtrans Subscription API

**Status: Available (with prerequisites)**

```
POST /v1/subscriptions          Create subscription
GET  /v1/subscriptions/:id     Get subscription
POST /v1/subscriptions/:id/disable   Disable subscription
POST /v1/subscriptions/:id/enable    Enable subscription
PATCH /v1/subscriptions/:id    Update subscription
```

**Supported payment methods:** `credit_card` and `gopay` (tokenization required)

**Prerequisites:**
- Requires special "recurring MID" from acquiring bank
- Additional business agreement needed
- Contact Midtrans Activation Team to activate

**Two modes:**
1. **Merchant-triggered:** Merchant schedules and triggers charges via Core API. Midtrans provides token.
2. **Midtrans-managed (Predefined Schedule):** Midtrans auto-charges on specified schedule. Requires recurring MID.

**Recurring object in Snap:**
```json
{
  "recurring": {
    "required": true,
    "start_time": "2024-06-09 15:07:00 +0700",
    "interval_unit": "week"  // or "month", "day"
  }
}
```

**Snap payment channels for subscription:** credit_card, gopay, bca_va, bni_va, bri_va, permata_va, cimb_va, other_va, echannel, indomaret, alfamart, shopeepay, kredivo, akulaku, other_qris

### Xendit Subscription (Full Support!)

**Status: Production-ready**

**Entry points:**
1. **Payment Session with type=SUBSCRIPTION** → Xendit hosts UI, collects + tokenizes payment method, creates recurring plan
2. **Existing Payment Token** → Direct create subscription plan from stored token

**Payment Session → Subscription flow:**
```
POST /sessions (session_type: "SUBSCRIPTION")
  → Returns payment_link_url or components_sdk_key
  → Customer links payment method
  → Webhooks: payment_session.completed, payment_token.activation, recurring.plan.activated
  → Xendit auto-manages billing cycles
```

**Webhook events:**
| Event | Description |
|-------|-------------|
| `recurring.plan.activated` | Subscription plan becomes active |
| `recurring.cycle.created` | New billing cycle created |
| `recurring.cycle.retrying` | Payment failed, retry scheduled |
| `recurring.cycle.succeeded` | Cycle payment successful |
| `recurring.cycle.failed` | All retry attempts exhausted |
| `payment.succeeded` | Individual payment success |
| `payment.failure` | Individual payment failure |

**Configuration:**
```json
{
  "session_type": "SUBSCRIPTION",
  "subscription": {
    "reference_id": "sub_123",
    "interval": "MONTH",
    "interval_count": 1,
    "anchor_date": "2026-04-09T23:23:52+07:00",
    "total_recurrence": 12,
    "retry_interval": "DAY",
    "retry_interval_count": 5,
    "total_retry": 7,
    "failed_cycle_action": "RESUME",
    "immediate_payment": false,
    "notification_config": {
      "recurring_reminder_days_before": [1, 3, 5]
    }
  }
}
```

**Usage-based subscriptions:** Supported! Merchant reports usage, Xendit bills based on reported amount.

**Supported payment methods for subscription:** Credit cards, e-wallets (via tokenization), bank transfers (via tokenization).

### DOKU Recurring Billing

**Status: Available**
- Built-in recurring billing feature
- Enterprise-grade with PCI DSS Level 1
- Custom pricing, requires direct engagement

### Duitku

**Status: No native subscription API**
- One-time payments only
- For recurring: merchant must generate new payment link each cycle

### Impact on BetterPay Architecture

**Key finding:** Both Midtrans and Xendit have native subscription APIs. This changes our architecture — we don't need to simulate subscriptions on top of payment links for these providers.

```
Provider subscription capability:
├── Xendit: FULL (Payment Session SUBSCRIPTION + auto-billing + retries)
├── Midtrans: AVAILABLE (Subscription API, needs recurring MID)
├── DOKU: AVAILABLE (recurring billing feature)
└── Duitku: NONE (payment-link only)

BetterPay strategy:
├── Xendit/Midtrans/DOKU: Use native subscription API when available
└── Duitku/fallback: Payment-link-based recurring (BetterPay manages cycle)
```

---

## 3. DOKU API (Latest — SNAP + Non-SNAP)

### Authentication: B2B Token Flow

```
POST /oauth/v2/access-token
Headers: X-TIMESTAMP, X-SIGNATURE (asymmetric RSA-SHA256)
Body: { grant_type: "client_credentials", client_id, client_secret }
Response: { access_token, token_type, expires_in }
```

### Signature Types

#### SNAP Mode (BI SNAP standard — mandatory for Open API)

**Symmetric Signature (transactions):**
```
stringToSign = HTTPMethod + ":" + EndpointUrl + ":" + AccessToken + ":" + Lowercase(HexEncode(SHA256(minify(RequestBody)))) + ":" + TimeStamp

Signature = HMAC_SHA512(clientSecret, stringToSign)
Header: X-Signature
```

**Asymmetric Signature (token generation):**
```
stringToSign = HTTPMethod + ":" + EndpointUrl + ":" + Lowercase(HexEncode(SHA256(minify(RequestBody)))) + ":" + TimeStamp

Signature = SHA256withRSA(privateKey, stringToSign)
Header: X-Signature
```

#### Non-SNAP Mode (legacy)

```
Components:
  Client-Id: MCH-xxxx
  Request-Id: uuid
  Request-Timestamp: ISO8601 UTC
  Request-Target: /path
  Digest: base64(SHA256(json_body))

stringToSign = "Client-Id:MCH-xxxx\nRequest-Id:uuid\nRequest-Timestamp:2020-08-11T08:45:42Z\nRequest-Target:/path\nDigest:base64hash"

Signature = "HMACSHA256=" + base64(HMAC_SHA256(secretKey, stringToSign))
Header: Signature
```

### Webhook (HTTP Notification)

Headers sent by DOKU:
| Header | Description |
|--------|-------------|
| Client-Id | DOKU client ID |
| Request-Id | Unique ID (max 128 chars) |
| Request-Timestamp | ISO8601 UTC |
| Signature | HMAC signature (verify using same formula as request, but Request-Target = merchant's notification URL path) |

Body: `transaction.status` = `SUCCESS` or `FAILED`

---

## 4. BI Regulation PBI 10/2025 (Effective March 31, 2026)

### What It Is
- **PBI No. 10/2025**: Pengaturan Industri Sistem Pembayaran
- **PADG No. 32/2025**: Implementing regulation
- Revokes PBI 22/23/2020, amends PBI 23/6/2021 and 23/7/2021
- Part of Blueprint Sistem Pembayaran Indonesia (BSPI) 2030

### Key Changes

#### TIKMI Assessment (new)
Performance assessment framework for all PSPs:
- **T**ransaksi — Transaction volume projections
- **I**nterkoneksi — Interconnection with BI infrastructure and other PSPs
- **K**ompetensi — HR competency (minimum expertise and certifications)
- **M**anajemen Risiko — Risk governance, BCP, operational risk mapping
- **I**nfrastruktur TI — IT capability (fraud management, resilience, cybersecurity)

#### PSP Classification (new tiered model)
- Payment Service Providers (PJP) — Payment gateway, acquiring, remittance
- Payment Infrastructure Providers (PIP) — Switching, clearing
- Supporting Providers (tiered: critical, crucial, non-critical)

#### Compliance Requirements
| Requirement | Deadline |
|-------------|----------|
| Regulation effective | March 31, 2026 |
| SBP/RBSP first submission | April 30, 2026 |
| TIKMI self-assessment | Feb 1 & Aug 1, starting 2027 |
| Full compliance (existing PSPs) | March 31, 2029 (3 years) |
| Extension possible | +2 years with BI approval |

#### Capital & Ownership
- **Minimum Category 1 capital:** IDR 15 billion
- **Foreign ownership:** Up to ~85% economic interest
- **Control requirement:** Indonesian parties must retain ≥51% voting rights + board appointment + veto rights
- **Minimum Indonesian shareholding:** 15% of total shares

#### SNAP Compliance
- **Mandatory** for PSPs offering Open API payment services
- Deadline for Service Providers: June 2024 (passed)
- Deadline for Service Users: June 2025 (passed)
- BI SNAP = standardized API format (similar to Open Banking standards)

### Impact on BetterPay

1. **BetterPay itself is NOT a PSP** — it's a framework/library that integrates with PSPs
2. **Users of BetterPay** who operate as PSPs need to comply
3. **Compliance plugin opportunity:** `@betterpay/compliance-bi` could help PSPs:
   - Generate TIKMI self-assessment reports
   - Track transaction volumes for reporting
   - Generate SBP/RBSP documents
   - Monitor SNAP API compliance

---

## 5. QRIS Developments (2026)

### Current MDR Rates (effective March 15, 2025)

| Merchant Type | Category | MDR |
|---------------|----------|-----|
| Usaha Mikro (UMI) | Transaction ≤ Rp 500K | **0%** |
| Usaha Mikro (UMI) | Transaction > Rp 500K | **0.3%** |
| Usaha Kecil/Menengah/Besar | All | **0.7%** |
| Education | All | **0.6%** |
| SPBU (Gas stations) | All | **0.4%** |
| BLU/PSO/G2P/P2G | All | **0%** |

### QRIS TUNTAS
- **Tarik Tunai** — Cash withdrawal via QR at ATM/agent
- **Transfer** — Fund transfer between QRIS users
- **Setor Tunai** — Cash deposit via QR at ATM/agent
- Launched Sept-Nov 2023, now widely available
- Transaction limit: Rp 10 million/transaction (follows QRIS limit)

### QRIS Cross-Border (Live as of June 2026)

| Country | Status | Launch |
|---------|--------|--------|
| Thailand | ✅ Live | August 2022 |
| Malaysia | ✅ Live | May 2023 |
| Singapore | ✅ Live | November 2023 |
| Japan | ✅ Live | 2024 |
| South Korea | ✅ Live | April 2026 |
| China | ✅ Live | April 30, 2026 |
| India | 🔄 Planned | 2026 target |
| Hong Kong | 🔄 Planned | 2026 target |
| Timor Leste | 🔄 Planned | 2026 target |

**2026 Targets ("17-8-45"):**
- 17 billion transactions
- 8 cross-border countries
- 45 million merchants (**already achieved: 45.3M as of April 2026**)
- 70 million users (63M as of April 2026)

**QRIS Tap (NFC-based):**
- Launched October 2025
- 508K transactions (1,200% MoM growth)
- Currently Android only, iOS support coming
- Implemented in 14 provinces

**Transaction Growth:**
- Through April 2026: 7.83 billion transactions
- YoY growth: 108%
- BRI alone: Rp 30.5 trillion QRIS volume (76% YoY)

### Impact on BetterPay

1. **QRIS is THE dominant payment method** in Indonesia — 0% MDR for micro merchants, 0.7% for others
2. **Cross-border QRIS** opens international payment possibilities
3. **BetterPay should prioritize QRIS integration** — it's the cheapest and fastest-growing payment method
4. **QRIS TUNTAS** (cash operations) is interesting for fintech use cases

---

## 6. Provider-Specific Integration Notes

### Midtrans

**Snap Checkout (recommended for BetterPay):**
- `POST /snap/v1/transactions` → returns token + redirect_url
- Auth: `Basic base64(serverKey:)`
- Frontend: Include `snap.js`, call `snap.pay(token)` for popup, or redirect to `redirect_url`
- Payment channels configurable via dashboard or `enabled_payments` API param
- Expiry: configurable up to 7 days for checkout page

**Core API (for subscription charges):**
- `POST /v2/charge` with `payment_type: credit_card` and `saved_token_id`
- Non-3DS recurring charges (requires special MID)
- `POST /v2/{order_id}/status` for status check
- `POST /v2/{order_id}/cancel` for cancellation

**Webhook notification:**
- Sent to merchant's configured URL
- JSON body with: order_id, transaction_status, status_code, gross_amount, signature_key
- `signature_key` = SHA512(order_id + status_code + gross_amount + server_key)
- Status values: capture, settlement, pending, deny, cancel, expire, failure

### Xendit

**Payment Sessions API (recommended):**
- `POST /payment_sessions` → returns payment_url (hosted) or components_sdk_key (embedded)
- Auth: `Basic base64(apiKey:)`
- Session types: PAY, SAVE, PAY_AND_SAVE, SUBSCRIPTION
- Status: ACTIVE → COMPLETED / EXPIRED / CANCELED

**Subscription via Payment Sessions:**
- `session_type: "SUBSCRIPTION"` with subscription config
- Xendit handles: billing cycle, retries, dunning, notifications
- Webhooks for full lifecycle: plan.activated, cycle.created/retrying/succeeded/failed

**Webhook:**
- Token-based: `X-CALLBACK-TOKEN` header compared with stored webhook token
- Events: payment_session.completed, payment_session.expired, payment.succeeded, payment.failure, recurring.plan.*, recurring.cycle.*

### DOKU

**API (SNAP mode — recommended):**
1. Get B2B token: `POST /oauth/v2/access-token` with asymmetric signature
2. Create transaction: endpoint-specific (VA, CC, QRIS, etc.)
3. Verify webhook: HMAC-SHA512 symmetric signature

**Available payment methods:** VA (BCA, BNI, BRI, Mandiri, CIMB, Permata, Danamon), Credit Card (with installments), QRIS, E-wallet, PayLater

**Webhook:**
- Headers: Client-Id, Request-Id, Request-Timestamp, Signature
- Verify: Generate expected signature using merchant's notification URL path as Request-Target
- Body: transaction.status = SUCCESS or FAILED

### Duitku

**API:**
- `POST /webapi/merchant/v2/inquiry` — create payment
- Auth: MD5 signature in body (`merchantCode + amount + orderId + apiKey`)
- Status check: `POST /webapi/merchant/transactionStatus`
- Cancel: not available via API

**Available payment methods:** VA (most banks including BCA, BNI, BRI, Mandiri, CIMB, Permata, Danamon, BSI), E-wallet (DANA, OVO, ShopeePay, LinkAja), QRIS, Credit Card, Retail (Indomaret, Alfamart)

**Webhook:**
- Content-type: `application/x-www-form-urlencoded` (unique!)
- Signature: SHA256(merchantCode + amount + orderId + apiKey)
- Result code: 00 = success, 01 = failed

---

## 7. Competitive Landscape Summary

### Best For...

| Use Case | Recommended | Why |
|----------|-------------|-----|
| **SaaS/Subscription** | Xendit | Native subscription API, retries, dunning, usage-based |
| **E-commerce** | Midtrans | Snap checkout, 24+ payment channels, GoPay integration |
| **Enterprise** | DOKU | Custom rates (20-40% lower), PCI DSS Level 1, direct bank partnerships |
| **VA-heavy** | Duitku | Most VA bank coverage, e-wallet linking |
| **Developer-first** | Xendit | Cleanest API, best docs, fastest onboarding |
| **Marketplace** | Xendit | Disbursement API, split payment support |
| **Cross-border SE Asia** | Xendit | Multi-country (ID, PH, MY, TH, VN, SG) |
| **QRIS-only** | Any | All providers support QRIS at 0.7% MDR |

### API Quality Ranking

1. **Xendit** ⭐⭐⭐⭐⭐ — Clean, modern, interactive docs, Postman collection, sandbox reliable
2. **Midtrans** ⭐⭐⭐⭐ — Functional but feels older, legacy endpoints alongside newer ones
3. **DOKU** ⭐⭐⭐ — Adequate, formal docs, SNAP compliance adds complexity
4. **Duitku** ⭐⭐⭐ — Basic but works, limited docs

---

*Research conducted June 10, 2026 via Exa deep search*
*Sources: BI official publications, provider documentation, Baker McKenzie, Mori Hamada, StackCompare, Fintech News Indonesia, PaymentBrief*
