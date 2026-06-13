# DOKU & Duitku API Research

Comprehensive API documentation research for integrating DOKU and Duitku payment gateways into BetterPay.

**Research Date:** 2026-06-11  
**Status:** Complete  
**Sources:** Official API documentation from developers.doku.com and docs.duitku.com

---

## Table of Contents

1. [DOKU Payment Gateway](#doku-payment-gateway)
   - [Authentication](#doku-authentication)
   - [Create Payment](#doku-create-payment)
   - [Webhook/Notifications](#doku-webhooks)
   - [Status Check](#doku-status-check)
   - [Payment Methods](#doku-payment-methods)
2. [Duitku Payment Gateway](#duitku-payment-gateway)
   - [Authentication](#duitku-authentication)
   - [Create Payment](#duitku-create-payment)
   - [Webhook/Callback](#duitku-webhooks)
   - [Status Check](#duitku-status-check)
   - [Payment Methods](#duitku-payment-methods)
3. [Comparison & Implementation Notes](#comparison)

---

## DOKU Payment Gateway

### DOKU Authentication

**Base URLs:**
- Sandbox: `https://sandbox.doku.com`
- Production: `https://api.doku.com`

**Authentication Method:** Basic Auth + Signature

**Credentials Required:**
- Merchant Code (from DOKU dashboard)
- Shared Key (secret key for signature)

**Signature Generation:**
```javascript
// Formula: SHA256(merchantCode + amount + sharedKey)
const stringToSign = merchantCode + amount + sharedKey;
const signature = crypto.createHash('sha256')
  .update(stringToSign)
  .digest('hex');
```

**Request Headers:**
```
Content-Type: application/json
```

### DOKU Create Payment

**Endpoint:** `POST /virtual-account/create`

**Request Body:**
```json
{
  "order": {
    "invoice_number": "INV-20210124-0001",
    "amount": 150000
  },
  "virtual_account_info": {
    "billing_type": "FIX_BILL",
    "expired_time": 60,
    "reusable_status": false,
    "info1": "Merchant Demo Store",
    "info2": "Thank you for shopping",
    "info3": "on our store"
  },
  "customer": {
    "name": "Jessica Tessalonika",
    "email": "jessica@example.com"
  }
}
```

**Request Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `order.invoice_number` | string | ✅ | Unique invoice number (max 50 chars) |
| `order.amount` | integer | ✅ | Amount in IDR (no decimals) |
| `virtual_account_info.billing_type` | string | ✅ | `FIX_BILL`, `NO_BILL`, `BILL_VARIABLE_AMOUNT`, `PARTIAL_AMOUNT` |
| `virtual_account_info.expired_time` | integer | ✅ | Expiry time in minutes |
| `virtual_account_info.reusable_status` | boolean | ❌ | Can VA be paid multiple times (default: false) |
| `virtual_account_info.info1` | string | ❌ | Custom info line 1 |
| `virtual_account_info.info2` | string | ❌ | Custom info line 2 |
| `virtual_account_info.info3` | string | ❌ | Custom info line 3 |
| `customer.name` | string | ❌ | Customer name |
| `customer.email` | string | ❌ | Customer email |

**Response:**
```json
{
  "response": {
    "code": "00",
    "message": "SUCCESS"
  },
  "virtual_account_data": {
    "payment_code": "1234567890123456",
    "expired_time": "2026-06-11T12:00:00+07:00",
    "amount": 150000
  }
}
```

**Billing Types:**
- `FIX_BILL` - Customer pays exact amount (closed amount)
- `NO_BILL` - Customer can pay any amount
- `BILL_VARIABLE_AMOUNT` - Customer pays within a range
- `PARTIAL_AMOUNT` - Customer pays partial amounts

### DOKU Webhooks

**Notification URL:** Set in DOKU dashboard

**Webhook Payload:**
```json
{
  "order": {
    "invoice_number": "INV-20210124-0001",
    "amount": 150000
  },
  "payment": {
    "payment_code": "1234567890123456",
    "payment_date": "2026-06-11T12:00:00+07:00",
    "channel": "BCA",
    "result": {
      "code": "00",
      "message": "SUCCESS"
    }
  }
}
```

**Signature Verification:**
```javascript
// Formula: SHA256(merchantCode + amount + sharedKey)
const stringToSign = merchantCode + amount + sharedKey;
const expectedSignature = crypto.createHash('sha256')
  .update(stringToSign)
  .digest('hex');

// Compare with received signature
if (expectedSignature === receivedSignature) {
  // Valid webhook
}
```

**Result Codes:**
- `00` - Success
- `01` - Pending
- `02` - Failed
- `03` - Expired

### DOKU Status Check

**Endpoint:** `GET /virtual-account/status/{payment_code}`

**Response:**
```json
{
  "response": {
    "code": "00",
    "message": "SUCCESS"
  },
  "virtual_account_data": {
    "payment_code": "1234567890123456",
    "status": "PAID",
    "amount": 150000,
    "payment_date": "2026-06-11T12:00:00+07:00"
  }
}
```

**Status Values:**
- `PENDING` - Waiting for payment
- `PAID` - Payment successful
- `EXPIRED` - Payment expired
- `CANCELLED` - Payment cancelled

### DOKU Payment Methods

**Virtual Account Banks:**
- BCA VA (6-digit BIN + 10-digit code)
- Mandiri VA (8-digit BIN + 8-digit code)
- BRI VA (6-digit BIN + 10-digit code)
- BNI VA (9-digit BIN + 7-digit code)
- Permata VA (5-digit BIN + 11-digit code)
- CIMB Niaga VA (5-digit BIN + 11-digit code)
- Danamon VA (5-digit BIN + 11-digit code)
- DOKU VA (2-digit BIN + 14-digit code)
- Maybank VA (6-digit BIN + 10-digit code)
- BTN VA (6-digit BIN + 10-digit code)
- BNC VA (9-digit BIN + 7-digit code)
- BSS VA (6-digit BIN + 10-digit code)

**Other Methods:**
- Credit Card (Visa, Mastercard, JCB)
- E-Wallet (OVO, DANA, ShopeePay, LinkAja)
- QRIS
- Retail (Indomaret, Alfamart)

---

## Duitku Payment Gateway

### Duitku Authentication

**Base URLs:**
- Sandbox: `https://sandbox.duitku.com`
- Production: `https://passport.duitku.com`

**Authentication Method:** Signature-based

**Credentials Required:**
- Merchant Code (from Duitku dashboard)
- API Key (secret key for signature)

**Signature Generation:**
```javascript
// Formula: HMAC_SHA256(merchantCode + merchantOrderId + amount, apiKey)
const stringToSign = merchantCode + merchantOrderId + amount;
const signature = crypto.createHmac('sha256', apiKey)
  .update(stringToSign)
  .digest('hex');
```

**Request Headers:**
```
Content-Type: application/json
```

### Duitku Create Payment

**Endpoint:** `POST /webapi/api/merchant/v2/inquiry`

**Request Body:**
```json
{
  "merchantCode": "DXXXX",
  "paymentAmount": 40000,
  "paymentMethod": "VC",
  "merchantOrderId": "abcde12345",
  "productDetails": "Payment example",
  "email": "customer@email.com",
  "phoneNumber": "08123456789",
  "customerVaName": "John Doe",
  "callbackUrl": "http://example.com/callback",
  "returnUrl": "http://example.com/return",
  "signature": "d842db69f70501fe69487b3d957611c2d4e47335f390a5895b0a762a1bf1f1a0",
  "expiryPeriod": 10
}
```

**Request Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `merchantCode` | string(50) | ✅ | Merchant code from Duitku |
| `paymentAmount` | integer | ✅ | Amount in IDR (no decimals) |
| `merchantOrderId` | string(50) | ✅ | Unique order ID from merchant |
| `productDetails` | string(255) | ✅ | Product/service description |
| `email` | string(255) | ✅ | Customer email |
| `paymentMethod` | string(2) | ✅ | Payment method code (see below) |
| `customerVaName` | string(20) | ✅ | Name shown on VA payment |
| `callbackUrl` | string(255) | ✅ | Webhook URL for payment notification |
| `returnUrl` | string(255) | ✅ | Redirect URL after payment |
| `signature` | string(255) | ✅ | HMAC SHA256 signature |
| `phoneNumber` | string(50) | ❌ | Customer phone number |
| `expiryPeriod` | integer | ❌ | Expiry time in minutes |
| `additionalParam` | string(255) | ❌ | Additional parameters |
| `merchantUserInfo` | string(255) | ❌ | Customer username on merchant site |
| `itemDetails` | array | ❌ | Item details (see below) |
| `customerDetail` | object | ❌ | Customer details (see below) |

**Response:**
```json
{
  "merchantCode": "DXXXX",
  "reference": "DXXXXCX80TZJ85Q70QCI",
  "paymentUrl": "https://sandbox.duitku.com/topup/topupdirectv2.aspx?ref=BCA7WZ7EIDXXXXWEC",
  "vaNumber": "7007014001444348",
  "qrString": "00020101021226660014ID.DANA.WWW...",
  "AppUrl": "https://tokopedia.app.link/...",
  "amount": "40000",
  "statusCode": "00",
  "statusMessage": "SUCCESS"
}
```

**Response Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `merchantCode` | string | Your merchant code |
| `reference` | string | Duitku transaction reference (save this!) |
| `paymentUrl` | string | Payment page URL |
| `vaNumber` | string | Virtual account number (if applicable) |
| `qrString` | string | QR code string for QRIS (generate QR from this) |
| `AppUrl` | string | Deep link for e-wallet apps |
| `amount` | string | Payment amount |
| `statusCode` | string | `00` = Success |
| `statusMessage` | string | Status message |

### Duitku Webhooks

**Callback URL:** Specified in `callbackUrl` parameter during payment creation

**Webhook Payload (POST):**
```
merchantCode=DXXXX&
amount=150000&
merchantOrderId=abcde12345&
productDetails=Payment example&
paymentCode=VA&
resultCode=00&
merchantUserId=test@example.com&
reference=DXXXXCX80TXXX5Q70QCI&
signature=d842db69f70501fe69487b3d957611c2d4e47335f390a5895b0a762a1bf1f1a0&
publisherOrderId=MGUHWKJX3M1KMSQN5&
spUserHash=xxxyyyzzz&
settlementDate=2023-07-25&
issuerCode=93600523
```

**Content-Type:** `application/x-www-form-urlencoded`

**Callback Parameters:**

| Parameter | Description |
|-----------|-------------|
| `merchantCode` | Your merchant code |
| `amount` | Transaction amount |
| `merchantOrderId` | Your order ID |
| `productDetail` | Product description |
| `additionalParam` | Additional parameters you sent |
| `paymentCode` | Payment method code |
| `resultCode` | `00` = Success, `01` = Failed |
| `merchantUserId` | Customer username/email |
| `reference` | Duitku transaction reference |
| `signature` | HMAC SHA256 signature |
| `publisherOrderId` | Unique Duitku payment ID |
| `spUserHash` | ShopeePay hash (if applicable) |
| `settlementDate` | Estimated settlement date (YYYY-MM-DD) |
| `issuerCode` | QRIS issuer code (if applicable) |

**Signature Verification:**
```javascript
// Formula: HMAC_SHA256(merchantCode + amount + merchantOrderId, apiKey)
const stringToSign = merchantCode + amount + merchantOrderId;
const expectedSignature = crypto.createHmac('sha256', apiKey)
  .update(stringToSign)
  .digest('hex');

// Compare with received signature
if (expectedSignature === receivedSignature) {
  // Valid webhook
}
```

**Result Codes:**
- `00` - Success
- `01` - Failed

### Duitku Status Check

**Endpoint:** `POST /webapi/api/merchant/transactionStatus`

**Request Body:**
```json
{
  "merchantCode": "DXXXX",
  "merchantOrderId": "abcde12345",
  "signature": "497fbf783f6d17d4b1e1ef468917bdc8"
}
```

**Request Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `merchantCode` | string | ✅ | Your merchant code |
| `merchantOrderId` | string | ✅ | Your order ID |
| `signature` | string | ✅ | HMAC_SHA256(merchantCode + merchantOrderId, apiKey) |

**Response:**
```json
{
  "merchantOrderId": "abcde12345",
  "reference": "DXXXXCX80TZJ85Q70QCI",
  "amount": "100000",
  "fee": "0.00",
  "statusCode": "00",
  "statusMessage": "SUCCESS"
}
```

**Status Codes:**
- `00` - Success
- `01` - Pending/Process
- `02` - Failed/Expired

### Duitku Payment Methods

**Payment Method Codes:**

| Category | Code | Method |
|----------|------|--------|
| **Credit Card** | `VC` | Visa/Mastercard/JCB |
| **Virtual Account** | `BC` | BCA VA |
| | `M2` | Mandiri VA |
| | `VA` | Maybank VA |
| | `I1` | BNI VA |
| | `B1` | CIMB Niaga VA |
| | `BT` | Permata VA |
| | `A1` | ATM Bersama |
| | `AG` | Bank Artha Graha |
| | `NC` | Bank Neo Commerce/BNC |
| | `BR` | BRIVA |
| | `S1` | Bank Sahabat Sampoerna |
| | `DM` | Danamon VA |
| | `BV` | BSI VA |
| **Retail** | `FT` | Pegadaian/Alfa/Pos |
| | `IR` | Indomaret |
| **E-Wallet** | `OV` | OVO (supports void) |
| | `SA` | ShopeePay Apps (supports void) |
| | `LF` | LinkAja Apps (fixed fee) |
| | `LA` | LinkAja Apps (percentage fee) |
| | `DA` | DANA |
| | `SL` | ShopeePay Account Link |
| | `OL` | OVO Account Link |
| **QRIS** | `SP` | ShopeePay |
| | `NQ` | Nobu |
| | `GQ` | Gudang Voucher |
| | `SQ` | Nusapay |
| **Paylater** | `DN` | Indodana Paylater |
| | `AT` | ATOME |
| **E-Banking** | `JP` | Jenius Pay |
| **E-Commerce** | `T1` | Tokopedia Card Payment |
| | `T2` | Tokopedia E-Wallet |
| | `T3` | Tokopedia Others |

**Default Expiry Periods:**
- Credit Card: 30 minutes
- Virtual Account: 1440 minutes (24 hours)
- Retail: 1440 minutes (24 hours)
- OVO: 10 minutes
- Shopee Pay Apps: 10 minutes (max 60 minutes)
- LinkAja Apps: 24 minutes
- DANA: 1440 minutes (24 hours)
- QRIS Payment: 10 minutes (max 60 minutes)
- Paylater: 720-1440 minutes

---

## Comparison & Implementation Notes

### Key Differences

| Feature | DOKU | Duitku |
|---------|------|--------|
| **Auth Method** | Basic Auth + SHA256 | HMAC SHA256 |
| **Signature Formula** | SHA256(merchantCode + amount + sharedKey) | HMAC_SHA256(merchantCode + orderId + amount, apiKey) |
| **Request Format** | JSON | JSON |
| **Callback Format** | JSON | URL-encoded form |
| **Callback Signature** | SHA256(merchantCode + amount + sharedKey) | HMAC_SHA256(merchantCode + amount + orderId, apiKey) |
| **VA Banks** | 12 banks | 14 banks |
| **E-Wallets** | 4 (OVO, DANA, ShopeePay, LinkAja) | 7 (+ Account Link options) |
| **QRIS Issuers** | N/A | 100+ issuers |
| **Payment Methods** | ~20 | ~35 |
| **Billing Types** | 4 types (FIX_BILL, NO_BILL, etc.) | N/A |
| **Reusable VA** | Yes | N/A |

### Implementation Strategy for BetterPay

#### DOKU Adapter

```typescript
// packages/doku/src/adapter.ts
import type { PaymentProvider } from '@betterpay/core';
import crypto from 'crypto';

export interface DokuConfig {
  merchantCode: string;
  sharedKey: string;
  isSandbox: boolean;
}

export const dokuProvider = (config: DokuConfig): PaymentProvider => ({
  id: 'doku',
  name: 'DOKU',
  
  async createPayment(params) {
    const baseUrl = config.isSandbox 
      ? 'https://sandbox.doku.com'
      : 'https://api.doku.com';
    
    // Generate signature
    const stringToSign = config.merchantCode + params.amount + config.sharedKey;
    const signature = crypto.createHash('sha256')
      .update(stringToSign)
      .digest('hex');
    
    // Make API call
    const response = await fetch(`${baseUrl}/virtual-account/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order: {
          invoice_number: params.orderId,
          amount: params.amount,
        },
        virtual_account_info: {
          billing_type: 'FIX_BILL',
          expired_time: params.expiryMinutes || 60,
          reusable_status: false,
        },
        customer: {
          name: params.customerName,
          email: params.customerEmail,
        },
      }),
    });
    
    const data = await response.json();
    
    return {
      providerTransactionId: data.virtual_account_data.payment_code,
      vaNumber: data.virtual_account_data.payment_code,
      status: 'pending',
      raw: data,
    };
  },
  
  async verifyWebhook(payload, signature) {
    // Extract amount from payload
    const { amount } = JSON.parse(payload);
    const stringToSign = config.merchantCode + amount + config.sharedKey;
    const expectedSignature = crypto.createHash('sha256')
      .update(stringToSign)
      .digest('hex');
    
    return signature === expectedSignature;
  },
  
  async normalizeWebhook(payload, headers) {
    const data = JSON.parse(payload);
    const resultCode = data.payment.result.code;
    
    return {
      orderId: data.order.invoice_number,
      amount: data.order.amount,
      status: resultCode === '00' ? 'completed' : 'failed',
      raw: data,
    };
  },
});
```

#### Duitku Adapter

```typescript
// packages/duitku/src/adapter.ts
import type { PaymentProvider } from '@betterpay/core';
import crypto from 'crypto';

export interface DuitkuConfig {
  merchantCode: string;
  apiKey: string;
  isSandbox: boolean;
}

export const duitkuProvider = (config: DuitkuConfig): PaymentProvider => ({
  id: 'duitku',
  name: 'Duitku',
  
  async createPayment(params) {
    const baseUrl = config.isSandbox 
      ? 'https://sandbox.duitku.com'
      : 'https://passport.duitku.com';
    
    // Generate signature
    const stringToSign = config.merchantCode + params.orderId + params.amount;
    const signature = crypto.createHmac('sha256', config.apiKey)
      .update(stringToSign)
      .digest('hex');
    
    // Make API call
    const response = await fetch(`${baseUrl}/webapi/api/merchant/v2/inquiry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        merchantCode: config.merchantCode,
        paymentAmount: params.amount,
        merchantOrderId: params.orderId,
        productDetails: params.description || 'Payment',
        email: params.customerEmail,
        paymentMethod: 'VC', // Default to credit card
        callbackUrl: params.webhookUrl,
        returnUrl: params.returnUrl,
        signature,
      }),
    });
    
    const data = await response.json();
    
    return {
      providerTransactionId: data.reference,
      paymentUrl: data.paymentUrl,
      vaNumber: data.vaNumber,
      qrString: data.qrString,
      status: 'pending',
      raw: data,
    };
  },
  
  async verifyWebhook(payload, signature) {
    // Parse URL-encoded form data
    const params = new URLSearchParams(payload);
    const merchantCode = params.get('merchantCode');
    const amount = params.get('amount');
    const merchantOrderId = params.get('merchantOrderId');
    
    const stringToSign = merchantCode + amount + merchantOrderId;
    const expectedSignature = crypto.createHmac('sha256', config.apiKey)
      .update(stringToSign)
      .digest('hex');
    
    return signature === expectedSignature;
  },
  
  async normalizeWebhook(payload, headers) {
    const params = new URLSearchParams(payload);
    const resultCode = params.get('resultCode');
    
    return {
      orderId: params.get('merchantOrderId'),
      amount: parseInt(params.get('amount') || '0'),
      status: resultCode === '00' ? 'completed' : 'failed',
      raw: Object.fromEntries(params),
    };
  },
});
```

### Status Mapping

**DOKU:**
```typescript
const DOKU_STATUS_MAP = {
  '00': 'completed',
  '01': 'pending',
  '02': 'failed',
  '03': 'expired',
};
```

**Duitku:**
```typescript
const DUITKU_STATUS_MAP = {
  '00': 'completed',
  '01': 'pending',
  '02': 'failed',
};
```

### Error Handling

**DOKU Error Codes:**
- `00` - Success
- `01` - Pending
- `02` - Failed
- `03` - Expired

**Duitku Error Codes:**
- `00` - Success
- `01` - Pending/Process
- `02` - Failed/Expired

### Testing

**DOKU Sandbox:**
- URL: https://sandbox.doku.com
- Demo: https://sandbox.doku.com/demo/

**Duitku Sandbox:**
- URL: https://sandbox.duitku.com
- Test cards and VA numbers provided in documentation

### Next Steps

1. ✅ Research complete
2. ⏳ Create `@betterpay/doku` package
3. ⏳ Create `@betterpay/duitku` package
4. ⏳ Implement adapters based on research
5. ⏳ Add tests with sandbox credentials
6. ⏳ Update documentation

---

## Sources

- DOKU API Documentation: https://developers.doku.com/
- DOKU Virtual Account Guide: https://developers.doku.com/accept-payments/direct-api/snap/integration-guide/virtual-account
- Duitku API Documentation: https://docs.duitku.com/api/en/
- Duitku GitHub: https://github.com/duitkupg

**Research completed on:** 2026-06-11
