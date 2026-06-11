# BetterPay Security Model

This document explains BetterPay's security architecture, what the library provides, and what user applications must implement.

## Table of Contents

1. [Security Philosophy](#security-philosophy)
2. [Security Responsibility Model](#security-responsibility-model)
3. [What BetterPay Provides](#what-betterpay-provides)
4. [What User Apps Must Implement](#what-user-apps-must-implement)
5. [Security Best Practices](#security-best-practices)
6. [Attack Vectors & Mitigations](#attack-vectors--mitigations)
7. [Compliance Considerations](#compliance-considerations)

## Security Philosophy

BetterPay follows the **library pattern**: we provide secure building blocks and hooks, but user applications are responsible for implementing security policies.

**Analogy:**
- BetterPay = Bank vault (secure infrastructure)
- User App = Security guard (authentication & authorization)

The vault is secure, but without a guard verifying who can enter, anyone could walk in.

## Security Responsibility Model

### 🔒 BetterPay Provides (Library Layer)

| Security Feature | Implementation | Status |
|-----------------|----------------|--------|
| **Input Validation** | Zod schemas for all endpoints | ✅ Protected |
| **Webhook Security** | Signature verification + replay protection | ✅ Protected |
| **Error Sanitization** | Generic errors to clients, detailed logs | ✅ Protected |
| **Request Size Limits** | 10MB max, prevents DoS | ✅ Protected |
| **Rate Limiting** | In-memory or distributed rate limiter | ✅ Protected |
| **Credential Encryption** | AES-256-GCM for API keys | ✅ Protected |
| **Security Middleware Hooks** | before/after/onError hooks | ✅ Available |
| **CSRF Protection Helpers** | `validateCSRF()` middleware | ✅ Available |
| **Auth Helpers** | `requireAuth()` middleware | ✅ Available |
| **Authorization Helpers** | `requireRole()`, `validateOwnership()` | ✅ Available |

### 🔑 User App Must Implement (Application Layer)

| Security Feature | Responsibility | How to Implement |
|-----------------|----------------|------------------|
| **Authentication** | Who is making the request? | Use `requireAuth()` with your auth system |
| **CSRF Protection** | Is the request from a trusted origin? | Use `validateCSRF()` with trusted origins |
| **Authorization** | Can this user access this resource? | Use `requireRole()` or `validateOwnership()` |
| **Audit Logging** | Track who did what | Use `after` middleware hook |
| **Secret Management** | Rotate API keys, encrypt at rest | Use your secret management system |
| **HTTPS** | Encrypt data in transit | Configure in your infrastructure |
| **Security Headers** | CSP, HSTS, X-Frame-Options | Use Helmet.js or similar |

## What BetterPay Provides

### 1. Input Validation

All API endpoints validate input using Zod schemas:

```typescript
// Example: createTransaction validation
{
  orderId: z.string().min(1).max(50),
  amount: z.number().positive().int(),
  currency: z.string().length(3),
  customerEmail: z.string().email(),
  // ... more fields
}
```

**Protection:** SQL injection, XSS, command injection

### 2. Webhook Security

Every provider webhook is verified:

```typescript
// Midtrans: SHA512 signature verification
verifyMidtransSignature(payload, signature, serverKey)

// Replay protection: 5-minute timestamp window
validateTimestamp(timestamp, { maxAge: 5 * 60 * 1000 })

// Idempotency: prevent duplicate processing
processedEvents.add(eventId)
```

**Protection:** Webhook spoofing, replay attacks

### 3. Error Sanitization

BetterPay never leaks internal details to clients:

```typescript
// ❌ Bad: Exposes stack trace
{ error: "TypeError: Cannot read property 'id' of undefined\n  at ..." }

// ✅ Good: Generic error
{ error: "Failed to create transaction", requestId: "abc123" }
```

**Protection:** Information disclosure

### 4. Request Size Limits

```typescript
if (size > 10 * 1024 * 1024) {
  return new Response('Request too large', { status: 413 });
}
```

**Protection:** DoS via large payloads

### 5. Rate Limiting

```typescript
const limiter = createRateLimiter({
  windowMs: 60000,  // 1 minute
  maxRequests: 100,  // 100 requests per minute
});

const result = limiter.check(clientIp);
if (!result.allowed) {
  return new Response('Rate limit exceeded', { status: 429 });
}
```

**Protection:** Brute force, DoS

### 6. Security Middleware Hooks

BetterPay provides hooks for user apps to inject security logic:

```typescript
const pay = betterPay({
  middleware: {
    before: [/* auth, CSRF, authorization */],
    after: [/* audit logging */],
    onError: /* custom error handler */,
  },
});
```

## What User Apps Must Implement

### 1. Authentication (CRITICAL)

**Without authentication, anyone can:**
- Create transactions for any user
- Subscribe users to paid plans
- Access other users' data

**Implementation:**

```typescript
import { betterPay, requireAuth } from '@betterpay/core';
import { auth } from '@/lib/auth';  // NextAuth, Clerk, Auth0, etc.

const pay = betterPay({
  middleware: {
    before: [
      requireAuth({
        auth: async (request) => {
          const session = await auth.getSession(request);
          if (!session?.user) return null;
          
          return {
            id: session.user.id,
            email: session.user.email,
            role: session.user.role,
          };
        },
      }),
    ],
  },
});
```

### 2. CSRF Protection (CRITICAL for browser apps)

**Without CSRF protection, attackers can:**
- Trick users into making unwanted payments
- Subscribe users to plans without consent

**Implementation:**

```typescript
import { betterPay, validateCSRF } from '@betterpay/core';

const pay = betterPay({
  middleware: {
    before: [
      validateCSRF({
        trustedOrigins: [
          'https://myapp.com',
          'https://admin.myapp.com',
        ],
      }),
    ],
  },
});
```

### 3. Authorization (CRITICAL)

**Without authorization, authenticated users can:**
- Access other users' transactions
- Modify other users' subscriptions
- View other users' invoices

**Implementation:**

```typescript
import { betterPay, validateOwnership } from '@betterpay/core';

const pay = betterPay({
  middleware: {
    before: [
      requireAuth({ auth: /* ... */ }),
      validateOwnership({
        getResourceOwnerId: async (ctx) => {
          const url = new URL(ctx.request.url);
          const orderId = url.pathname.split('/').pop();
          const order = await db.orders.findById(orderId);
          return order?.customerId ?? null;
        },
      }),
    ],
  },
});
```

### 4. Audit Logging (IMPORTANT)

**Without audit logging, you cannot:**
- Investigate security incidents
- Prove compliance (PCI DSS, SOC 2)
- Detect fraudulent activity

**Implementation:**

```typescript
import type { SecurityMiddleware } from '@betterpay/core';

const auditLogger: SecurityMiddleware = async (ctx) => {
  await db.auditLogs.create({
    userId: ctx.user?.id,
    action: `${ctx.request.method} ${new URL(ctx.request.url).pathname}`,
    timestamp: new Date(),
    ip: ctx.request.headers.get('x-forwarded-for'),
    metadata: ctx.metadata,
  });
  return undefined;
};

const pay = betterPay({
  middleware: {
    after: [auditLogger],
  },
});
```

## Security Best Practices

### ✅ Do This

1. **Always authenticate** — Use `requireAuth()` on all endpoints
2. **Validate ownership** — Users should only access their own resources
3. **Use CSRF protection** — Especially for browser-based apps
4. **Log everything** — Audit logs are critical for security
5. **Use HTTPS** — Always in production
6. **Rotate secrets** — Use secret management system
7. **Rate limit** — Prevent abuse
8. **Custom error handlers** — Never expose stack traces

### ❌ Don't Do This

1. **Don't skip authentication** — Even for "internal" endpoints
2. **Don't trust client input** — Always validate server-side
3. **Don't expose API keys** — Use environment variables
4. **Don't disable CSRF** — Even if it's "inconvenient"
5. **Don't log sensitive data** — No passwords, no full card numbers
6. **Don't ignore errors** — Always handle and log errors

## Attack Vectors & Mitigations

### Attack 1: Unauthorized Subscription

**Scenario:** Attacker subscribes victim to paid plan without authorization

**Without protection:**
```bash
curl -X POST https://yourapp.com/pay/subscribe \
  -d '{"customerId": "victim_id", "planId": "enterprise"}'
```

**With protection:**
```typescript
middleware: {
  before: [
    requireAuth({ auth: /* ... */ }),
    validateOwnership({
      getResourceOwnerId: async (ctx) => ctx.user?.id,
    }),
  ],
}
```

**Result:** 403 Forbidden — attacker cannot access victim's account

### Attack 2: Webhook Replay

**Scenario:** Attacker captures valid webhook and replays it

**Without protection:**
```bash
# Capture webhook
webhook=$(curl -X POST https://yourapp.com/pay/webhook/midtrans ...)

# Replay within 5 minutes
curl -X POST https://yourapp.com/pay/webhook/midtrans -d "$webhook"
```

**With protection:**
```typescript
// BetterPay automatically validates timestamp
validateTimestamp(timestamp, { maxAge: 5 * 60 * 1000 })
```

**Result:** 400 Bad Request — webhook is too old

### Attack 3: CSRF Attack

**Scenario:** Attacker tricks user into making unwanted payment

**Without protection:**
```html
<!-- Attacker website -->
<form action="https://yourapp.com/pay/subscribe" method="POST">
  <input name="customerId" value="victim_id">
  <input name="planId" value="enterprise">
</form>
<script>document.forms[0].submit();</script>
```

**With protection:**
```typescript
middleware: {
  before: [
    validateCSRF({
      trustedOrigins: ['https://myapp.com'],
    }),
  ],
}
```

**Result:** 403 Forbidden — origin not trusted

### Attack 4: Data Leakage

**Scenario:** User enumerates other users' transactions

**Without protection:**
```bash
# Try random order IDs
for i in {1..1000}; do
  curl https://yourapp.com/pay/status/order_$i
done
```

**With protection:**
```typescript
middleware: {
  before: [
    requireAuth({ auth: /* ... */ }),
    validateOwnership({
      getResourceOwnerId: async (ctx) => {
        const orderId = new URL(ctx.request.url).pathname.split('/').pop();
        const order = await db.orders.findById(orderId);
        return order?.customerId ?? null;
      },
    }),
  ],
}
```

**Result:** 403 Forbidden — user cannot access other users' data

## Compliance Considerations

### PCI DSS

If you handle credit card data:
- **Requirement 3:** Protect stored cardholder data → Use credential encryption
- **Requirement 6:** Develop secure systems → Use input validation
- **Requirement 8:** Identify and authenticate access → Use `requireAuth()`
- **Requirement 10:** Track and monitor access → Use audit logging

### SOC 2

For service organizations:
- **CC6.1:** Logical access security → Authentication + authorization
- **CC6.6:** Security measures against threats → CSRF + rate limiting
- **CC7.2:** Monitoring for unauthorized activity → Audit logging

### GDPR

For EU data protection:
- **Article 32:** Security of processing → Encryption + access control
- **Article 33:** Breach notification → Audit logs help detect breaches

## Security Checklist

Use this checklist before deploying to production:

- [ ] **Authentication** — All endpoints require authentication
- [ ] **Authorization** — Users can only access their own resources
- [ ] **CSRF Protection** — Browser apps validate origin
- [ ] **Audit Logging** — All actions are logged
- [ ] **HTTPS** — Production uses HTTPS
- [ ] **Rate Limiting** — Endpoints are rate limited
- [ ] **Error Handling** — Errors don't expose internals
- [ ] **Secret Management** — API keys are encrypted
- [ ] **Input Validation** — All inputs are validated
- [ ] **Webhook Security** — Signatures are verified

## Learn More

- [Security Middleware Examples](./SECURITY_MIDDLEWARE.md)
- [Architecture Documentation](../ARCHITECTURE.md)
- [API Documentation](./API.md)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)

## Security Contact

If you discover a security vulnerability in BetterPay, please report it responsibly:

**Email:** security@betterpay.dev  
**PGP Key:** [security@betterpay.dev.asc](./security@betterpay.dev.asc)

Please do NOT open public GitHub issues for security vulnerabilities.
