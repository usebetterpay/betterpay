# Additional Indonesian Payment Gateway Research

Research on additional Indonesian payment gateway APIs for potential integration into BetterPay.

**Research Date:** 2026-06-11  
**Status:** Complete  
**Providers Researched:** iPaymu, Finpay, NicePay, Espay, Tripay, Mayar

---

## Table of Contents

1. [iPaymu](#ipaymu)
2. [Finpay](#finpay)
3. [NicePay](#nicepay)
4. [Espay](#espay)
5. [Tripay](#tripay)
6. [Mayar](#mayar)
7. [Comparison Summary](#comparison-summary)

---

## iPaymu

**Documentation:** https://ipaymu.com/en/api-documentation/

### Authentication
- **Method:** API Key authentication
- **Credentials:** API Key from iPaymu dashboard
- **Format:** Query parameter or header

### API Endpoints

#### 1. Check Balance
```
GET https://my.ipaymu.com/api/saldo?key={API_KEY}
```

**Response:**
- Balance information in XML format
- Returns current account balance

#### 2. Check Transaction
```
GET https://my.ipaymu.com/api/transaksi?key={API_KEY}&id={transaction_id}
```

**Response:**
- Transaction status (deposit/transfer/COD)
- Transaction details in XML format

#### 3. API Payment
- **Direct Payment:** Process payment directly on merchant site
- **Redirect Payment:** Redirect to iPaymu payment page
- Detailed documentation available via Postman collection

#### 4. Payment Notification (Webhook)
- **Method:** POST to `unotify` parameter
- **Format:** POST data with transaction status
- **Parameters sent:**
  - Transaction ID
  - Status (success/failed)
  - Amount
  - Payment method
  - Timestamp

### Payment Methods
- Virtual Account (multiple banks)
- E-Wallet (OVO, DANA, ShopeePay, LinkAja)
- QRIS
- Credit Card
- Retail (Alfamart, Indomaret)

### Implementation Notes
- Integration can be done without account verification
- XML response format (not JSON)
- Real-time transaction data access
- Postman collection available for testing

---

## Finpay

**Documentation:** https://hub.finpay.id/docs/finpay-pg/api/

### Overview
Finpay Core API enables direct integration without redirecting to Finpay-hosted pages. Payment form and data input are native to merchant's website/application.

### Authentication
- **Method:** API credentials
- **Security:** Cardholder data not stored on merchant server
- **Compliance:** PCI-DSS compliant architecture

### Transaction Flow
1. Customer initiates payment on merchant site
2. Merchant sends transaction request to Finpay API
3. Finpay processes payment
4. Finpay sends webhook notification to merchant
5. Merchant updates order status

### API Features
- **Core API:** Direct payment integration
- **Hosted Payment Page:** Redirect-based payment
- **Webhook Notifications:** Real-time payment status updates
- **Transaction Status Inquiry:** Check payment status

### Payment Methods
- Credit/Debit Cards
- Virtual Account
- E-Wallet
- QRIS
- Convenience Store

### Implementation Notes
- Native payment page integration (no redirect)
- PCI-DSS compliance maintained
- Multiple API integration options
- Comprehensive webhook system

---

## NicePay

**Documentation:** https://docs.nicepay.co.id/en/nicepay-api

### Overview
NICEPAY provides multiple API versions with various payment methods. Committed to Bank Indonesia SNAP standard.

### API Versions

#### 1. API SNAP BI (Recommended)
- **Standard:** Bank Indonesia SNAP compliant
- **Payment Methods:** Virtual Account, E-Wallet, QRIS, Payout
- **Mandatory:** For VA, E-Wallet, QRIS, Payout services
- **Documentation:** https://docs.nicepay.co.id/nicepay-api-snap

#### 2. API Version 2 (V2)
- **Features:** Advanced payment options
- **Payment Methods:** Credit Card, Virtual Account, Convenience Store, Direct Debit, Payloan, E-Wallet, QRIS, GPN, Payout
- **Documentation:** https://docs.nicepay.co.id/en/nicepay-api-v2

#### 3. API Version 1 (V1)
- **Variants:** V1 Professional, V1 Enterprise
- **Payment Methods:** Credit Card, Virtual Account, Convenience Store, Direct Debit, E-Wallet, QRIS, Payout
- **Legacy:** For existing merchants not yet migrated to V2

#### 4. API Business Report
- **Purpose:** Check transaction and settlement history
- **Documentation:** https://docs.nicepay.co.id/en/nicepay-api-business-report

### Payment Page Options

| API | Payment Page |
|-----|--------------|
| Checkout API (Redirect/Professional) | NICEPAY Secure Payment Page |
| Payment API (Direct/Enterprise) | Merchant-hosted payment page |

### Payment Methods
- **Credit Card:** Visa, Mastercard, JCB
- **Virtual Account:** Multiple banks
- **Convenience Store:** Alfamart, Indomaret
- **Direct Debit:** Bank direct debit
- **E-Wallet:** OVO, DANA, ShopeePay, LinkAja
- **QRIS:** All QRIS issuers
- **GPN:** Gerbang Pembayaran Nasional
- **Payout:** Disbursement service

### Implementation Notes
- **Recommendation:** Use API SNAP BI or API V2
- **Library & Plugin:** SDK available for multiple programming languages
- **API Playground:** Real-time testing available
- **Payment Page Customization:** Customizable payment UI

---

## Espay

**Documentation:** https://sandbox-kit.espay.id/docs/v2/docespay/en/api.php

### Overview
Espay API facilitates information and data exchange between applications. Developers can access Espay functionality for receiving payments, creating invoices, sending funds, and managing accounts.

### Authentication

#### API Keys
- **Secret Key:** Full API access, must be kept on server only
- **Public Key:** Identify account, can be exposed in client-side code

#### Key Types Received
1. Secret key (trial mode)
2. Public key (trial mode)
3. Public key (live mode)

#### Environment Modes
- **Test Mode:** For development and testing
- **Live Mode:** For production transactions

**Important:** Use test mode API key only for development to prevent accidental live transactions.

### API Methods

#### 1. Receiving Payments
- Create payment transactions
- Multiple payment method support
- Real-time notifications

#### 2. Creating Invoices
- Generate invoices programmatically
- Customizable invoice details
- Automatic payment reminders

#### 3. Sending Funds
- Disbursement API
- Bulk transfer support
- Real-time status updates

#### 4. Managing Accounts
- Account balance inquiry
- Transaction history
- Account management operations

### Security
- API key authentication
- Separate keys for test and live environments
- Secret key must never be exposed client-side
- Public key for client-side identification

### Implementation Notes
- Two API key types (secret and public)
- Test and live environment separation
- Multiple API methods beyond payments
- Comprehensive account management

---

## Tripay

**Documentation:** https://tripay.co.id/developer

### Overview
Tripay provides two types of payment channels: Open Payment and Closed Payment, with Direct and Redirect transaction types.

### Payment Channel Types

#### Open Payment
- **Amount:** Customer determines payment amount
- **VA Usage:** 1 VA number can be used multiple times
- **Fee:** Transaction fee charged to merchant only

#### Closed Payment
- **Amount:** Merchant determines payment amount
- **VA Usage:** 1 VA number can only be used once
- **Fee:** Transaction fee can be charged to merchant or customer

### Transaction Types

#### Direct
1. Customer checkout on merchant site
2. System requests transaction to Tripay API
3. Tripay provides payment code/VA number
4. System informs customer of payment code
5. Customer makes payment
6. Tripay receives payment status
7. Funds enter merchant account
8. Tripay sends notification to system
9. System validates payment
10. System processes order

#### Redirect
1. Customer checkout on merchant site
2. System requests transaction to Tripay API
3. Tripay provides payment URL
4. System redirects customer to payment URL
5. Customer completes payment
6. Tripay receives payment status
7. Funds enter merchant account
8. Tripay sends notification to system
9. System validates payment
10. System processes order

### Authentication

#### Signature Generation
```php
$privateKey = 'your_private_key';
$merchantCode = 'T0001';
$merchantRef = 'INV55567';
$amount = 1500000;

$signature = hash_hmac('sha256', $merchantCode.$merchantRef.$amount, $privateKey);
```

**Algorithm:** HMAC-SHA256  
**String to Sign:** `{merchantCode}{merchantRef}{amount}`  
**Key:** Private Key

### API Endpoints

#### 1. Payment Instruction
```
GET https://tripay.co.id/api/payment/instruction
Authorization: Bearer {api_key}

Parameters:
- code: Payment channel code (e.g., BRIVA)
- pay_code: Payment code/VA number (optional)
- amount: Payment amount (optional)
- allow_html: Allow HTML in instructions (0/1, default: 1)
```

#### 2. Merchant Payment Channel
```
GET https://tripay.co.id/api/merchant/payment-channel
Authorization: Bearer {api_key}
```

**Response:** List of active payment channels with fee information

#### 3. Merchant Fee Calculator
```
GET https://tripay.co.id/api/merchant/fee-calculator
Authorization: Bearer {api_key}

Parameters:
- amount: Transaction amount (required)
- code: Payment channel code (optional)
```

#### 4. Merchant Transactions
```
GET https://tripay.co.id/api/merchant/transactions
Authorization: Bearer {api_key}

Parameters:
- page: Page number
- per_page: Records per page (max: 50)
- sort: asc/desc
- reference: Filter by reference
- merchant_ref: Filter by merchant reference
- method: Filter by payment method
- status: Filter by status
```

#### 5. Create Transaction (Closed Payment)
```
POST https://tripay.co.id/api/transaction/create
Authorization: Bearer {api_key}

Parameters:
- method: Payment channel code (required)
- merchant_ref: Merchant reference/invoice number (required)
- amount: Total payment amount (required)
- customer_name: Customer name (required)
- customer_email: Customer email (required)
- customer_phone: Customer phone (optional, required for some channels)
- order_items: Product details array (required)
- callback_url: Callback URL (optional)
- return_url: Redirect URL (optional)
- expired_time: Expiry timestamp (optional, default: 24 hours)
- signature: HMAC-SHA256 signature (required)
```

**Signature Generation:**
```php
$signature = hash_hmac('sha256', $merchantCode.$merchantRef.$amount, $privateKey);
```

#### 6. Transaction Detail
```
GET https://tripay.co.id/api/transaction/detail
Authorization: Bearer {api_key}

Parameters:
- reference: Transaction reference (required)
```

#### 7. Check Transaction Status
```
GET https://tripay.co.id/api/transaction/check-status
Authorization: Bearer {api_key}

Parameters:
- reference: Transaction reference (required)
```

#### 8. Open Payment Create
```
POST https://tripay.co.id/api/open-payment/create
Authorization: Bearer {api_key}

Parameters:
- method: Payment channel code (required)
- merchant_ref: Merchant reference (optional)
- customer_name: Customer name (optional)
- signature: HMAC-SHA256 signature (required)
```

**Signature Generation:**
```php
$signature = hash_hmac('sha256', $merchantCode.$channel.$merchantRef, $privateKey);
```

### Callback/Webhook

#### Endpoint
- **Method:** POST
- **URL:** Configured in merchant settings or per transaction

#### Headers
- `Content-Type: application/json`
- `X-Callback-Signature: {signature}`
- `X-Callback-Event: payment_status`

#### Callback Data
```json
{
  "reference": "T0001000000000000006",
  "merchant_ref": "INV364654",
  "payment_method": "BCA Virtual Account",
  "payment_method_code": "BCAVA",
  "total_amount": 200000,
  "fee_merchant": 2000,
  "fee_customer": 0,
  "total_fee": 2000,
  "amount_received": 198000,
  "is_closed_payment": 1,
  "status": "PAID",
  "paid_at": 1608133017,
  "note": null
}
```

#### Signature Verification
```php
$privateKey = 'your_private_key';
$json = file_get_contents('php://input');
$signature = hash_hmac('sha256', $json, $privateKey);

// Compare with X-Callback-Signature header
if ($signature === $_SERVER['HTTP_X_CALLBACK_SIGNATURE']) {
  // Valid callback
}
```

#### Response
```json
{
  "success": true
}
```

**Retry Policy:** If system doesn't receive valid response, Tripay retries every 2 minutes, max 3 times.

### Payment Methods

#### Virtual Account
- **PERMATAVA** - Permata VA (Rp 4,250)
- **BNIVA** - BNI VA (Rp 4,250)
- **BRIVA** - BRI VA (Rp 4,250)
- **MANDIRIVA** - Mandiri VA (Rp 4,250)
- **BCAVA** - BCA VA (Rp 5,500)
- **MUAMALATVA** - Muamalat VA (Rp 4,250)
- **CIMBVA** - CIMB Niaga VA (Rp 4,250)
- **BSIVA** - BSI VA (Rp 4,250)
- **OCBCVA** - OCBC NISP VA (Rp 4,250)
- **DANAMONVA** - Danamon VA (Rp 4,250)
- **OTHERBANKVA** - Other Bank VA (Rp 4,250)

#### Retail
- **ALFAMART** - Alfamart (Rp 3,500)
- **INDOMARET** - Indomaret (Rp 3,500)
- **ALFAMIDI** - Alfamidi (Rp 3,500)

#### E-Wallet
- **OVO** - OVO (3%, min Rp 1,000)
- **DANA** - DANA (3%, min Rp 1,000)
- **SHOPEEPAY** - ShopeePay (3%, min Rp 1,000)

#### QRIS
- **QRIS** - QRIS by ShopeePay (Rp 750 + 0.7%)
- **QRISC** - QRIS Customizable (Rp 750 + 0.7%)
- **QRIS2** - QRIS (Rp 750 + 0.7%)
- **QRIS_SHOPEEPAY** - QRIS Custom by ShopeePay (Rp 750 + 0.7%)

### Transaction Status
- **UNPAID** - Waiting for payment
- **PAID** - Payment successful
- **EXPIRED** - Payment expired
- **FAILED** - Payment failed
- **REFUND** - Payment refunded

### E-Wallet Account Linking

#### Link Account
```
POST https://tripay.co.id/api/ewallet/link
Authorization: Bearer {api_key}

Parameters:
- wallet_type: DANA (required)
- mobile_phone: Phone number (required)
- signature: HMAC-SHA256 signature (required)
```

#### Unlink Account
```
POST https://tripay.co.id/api/ewallet/unlink
Authorization: Bearer {api_key}

Parameters:
- wallet_type: DANA (required)
- mobile_phone: Phone number (required)
- signature: HMAC-SHA256 signature (required)
```

#### Get Account Detail
```
GET https://tripay.co.id/api/ewallet/detail
Authorization: Bearer {api_key}

Parameters:
- wallet_type: DANA (required)
- mobile_phone: Phone number (required)
```

### Implementation Notes
- **IP Whitelist:** 95.111.200.230 (IPv4), 2a04:3543:1000:2310:ac92:4cff:fe87:63f9 (IPv6)
- **Sandbox URL:** https://tripay.co.id/api-sandbox/
- **Production URL:** https://tripay.co.id/api/
- **Callback Tester:** https://tripay.co.id/member/developer/callback-tester
- **Signature Algorithm:** HMAC-SHA256
- **Additional Fee:** Rp 3,000 for Indomaret/Alfamart/Alfamidi cashier payments

---

## Mayar

**Documentation:** https://docs.mayar.id/api-reference/introduction

### Overview
Mayar Headless API separates frontend (UI) from backend (product management and transaction processing). Allows building custom e-commerce experiences with modern web technologies.

### Authentication

#### API Key Types
1. **Read Only:** Only GET method endpoints accessible
2. **Read & Write:** Both GET and POST method endpoints accessible

#### API Key Generation
- **Production:** https://web.mayar.id/api-keys
- **Sandbox:** https://web.mayar.club/api-keys

**Security Note:** Never share API keys. Domain/subdomain changes require new API key generation.

### Environment

#### Production
- **Web:** https://web.mayar.id/
- **API Base URL:** https://api.mayar.id/hl/v1

#### Sandbox
- **Web:** https://web.mayar.club/
- **API Base URL:** https://api.mayar.club/hl/v1

### API Features

#### Headless Commerce
- **Separation:** Frontend and backend decoupled
- **Flexibility:** Build custom UI with React, Vue.js, etc.
- **Backend Tasks:** Product storage, order processing, payment integration
- **Benefits:** Focus on UX without platform limitations

#### API Capabilities
- Product management
- Order processing
- Payment integration
- Transaction history
- Customer management

### Payment Methods
- Virtual Account
- E-Wallet
- QRIS
- Credit Card
- Convenience Store
- Direct Debit

### Implementation Notes
- **Headless Architecture:** Complete frontend/backend separation
- **API Key Permissions:** Read-only or Read & Write options
- **Sandbox Environment:** Full testing environment available
- **Domain Binding:** API keys tied to specific domains
- **Modern Stack:** Supports React, Vue.js, and other modern frameworks

---

## Comparison Summary

| Provider | Auth Method | Signature | Payment Methods | API Style | Sandbox |
|----------|-------------|-----------|-----------------|-----------|---------|
| **iPaymu** | API Key | N/A | VA, E-Wallet, QRIS, CC, Retail | REST (XML) | Yes |
| **Finpay** | API Credentials | PCI-DSS | CC, VA, E-Wallet, QRIS, Retail | REST | Yes |
| **NicePay** | API Credentials | Multiple | CC, VA, Retail, DD, E-Wallet, QRIS, GPN | REST (Multiple versions) | Yes |
| **Espay** | API Key (Secret/Public) | N/A | Multiple | REST | Yes |
| **Tripay** | Bearer Token + Signature | HMAC-SHA256 | VA, Retail, E-Wallet, QRIS | REST (JSON) | Yes |
| **Mayar** | API Key | N/A | VA, E-Wallet, QRIS, CC, Retail | REST (Headless) | Yes |

### Recommendations for BetterPay Integration

#### High Priority (Recommended)
1. **Tripay**
   - Comprehensive documentation
   - Modern API design (JSON, Bearer token)
   - Clear signature verification (HMAC-SHA256)
   - Multiple payment methods
   - Good fee structure
   - Active maintenance

2. **NicePay**
   - Bank Indonesia SNAP compliant
   - Multiple API versions (flexibility)
   - Comprehensive payment methods
   - Library and plugin support
   - Professional documentation

#### Medium Priority
3. **Mayar**
   - Headless architecture (modern approach)
   - Good for custom UI implementations
   - Clean API design
   - Limited documentation depth

4. **Finpay**
   - PCI-DSS compliant
   - Native payment page integration
   - Limited public documentation

#### Low Priority
5. **Espay**
   - Multiple API methods
   - Secret/public key separation
   - Limited documentation

6. **iPaymu**
   - XML response format (not JSON)
   - Basic API features
   - Limited modern features

### Implementation Strategy

#### Phase 1: Tripay Integration
1. Implement HMAC-SHA256 signature verification
2. Create adapter for closed payment transactions
3. Implement callback/webhook handler
4. Add payment method mapping
5. Test with sandbox environment

#### Phase 2: NicePay Integration
1. Implement SNAP BI API adapter
2. Add V2 API support
3. Implement multiple payment methods
4. Add library integration
5. Test with API playground

#### Phase 3: Mayar Integration
1. Implement headless API adapter
2. Add API key management
3. Implement domain binding
4. Test with sandbox environment

### Key Findings

1. **Tripay** stands out as the most developer-friendly with:
   - Clear documentation
   - Modern API design
   - Comprehensive payment methods
   - Good fee structure
   - Active development

2. **NicePay** offers:
   - Bank Indonesia compliance
   - Multiple API versions
   - Professional support
   - Extensive payment methods

3. **All providers** offer:
   - Sandbox environments
   - Virtual Account support
   - E-Wallet integration
   - QRIS support
   - Webhook notifications

### Next Steps

1. **Create Tripay adapter** (highest priority)
2. **Create NicePay adapter** (second priority)
3. **Create Mayar adapter** (third priority)
4. **Update provider comparison** in main documentation
5. **Add integration guides** for each provider
6. **Test all adapters** with sandbox environments

---

## Sources

- iPaymu: https://ipaymu.com/en/api-documentation/
- Finpay: https://hub.finpay.id/docs/finpay-pg/api/
- NicePay: https://docs.nicepay.co.id/en/nicepay-api
- Espay: https://sandbox-kit.espay.id/docs/v2/docespay/en/api.php
- Tripay: https://tripay.co.id/developer
- Mayar: https://docs.mayar.id/api-reference/introduction

**Research completed on:** 2026-06-11
