# Security Middleware Examples

This document demonstrates how to use BetterPay's security middleware system to implement authentication, CSRF protection, authorization, and audit logging in your application.

## Table of Contents

1. [Basic Authentication](#basic-authentication)
2. [CSRF Protection](#csrf-protection)
3. [Role-Based Access Control](#role-based-access-control)
4. [Resource Ownership Validation](#resource-ownership-validation)
5. [Audit Logging](#audit-logging)
6. [Complete Example](#complete-example)

## Basic Authentication

Use `requireAuth` to protect endpoints that require authentication:

```typescript
import { betterPay, requireAuth } from '@betterpay/core';
import { auth } from '@/lib/auth'; // Your auth system (NextAuth, Clerk, etc.)

const pay = betterPay({
  plugins: [/* ... */],
  middleware: {
    before: [
      requireAuth({
        auth: async (request) => {
          // Integrate with your auth system
          const session = await auth.getSession(request);
          if (!session?.user) return null;
          
          return {
            id: session.user.id,
            email: session.user.email,
            role: session.user.role,
          };
        },
        errorMessage: 'Please login to continue',
        statusCode: 401,
      }),
    ],
  },
});
```

## CSRF Protection

Use `validateCSRF` to protect against cross-site request forgery:

```typescript
import { betterPay, validateCSRF } from '@betterpay/core';

const pay = betterPay({
  plugins: [/* ... */],
  middleware: {
    before: [
      validateCSRF({
        trustedOrigins: [
          'https://myapp.com',
          'https://admin.myapp.com',
          'https://*.myapp.com', // Wildcard support
        ],
        errorMessage: 'Invalid origin',
        statusCode: 403,
      }),
    ],
  },
});
```

## Role-Based Access Control

Use `requireRole` to restrict access based on user roles:

```typescript
import { betterPay, requireAuth, requireRole } from '@betterpay/core';

const pay = betterPay({
  plugins: [/* ... */],
  middleware: {
    before: [
      // First authenticate
      requireAuth({
        auth: async (request) => {
          const session = await auth.getSession(request);
          return session?.user ?? null;
        },
      }),
      
      // Then check role
      requireRole({
        roles: ['admin', 'finance'],
        errorMessage: 'Insufficient permissions',
        statusCode: 403,
      }),
    ],
  },
});
```

## Resource Ownership Validation

Use `validateOwnership` to ensure users can only access their own resources:

```typescript
import { betterPay, requireAuth, validateOwnership } from '@betterpay/core';

const pay = betterPay({
  plugins: [/* ... */],
  middleware: {
    before: [
      requireAuth({
        auth: async (request) => {
          const session = await auth.getSession(request);
          return session?.user ?? null;
        },
      }),
      
      validateOwnership({
        getResourceOwnerId: async (ctx) => {
          // Extract resource ID from request
          const url = new URL(ctx.request.url);
          const orderId = url.pathname.split('/').pop();
          
          if (!orderId) return null;
          
          // Look up resource owner
          const order = await db.orders.findById(orderId);
          return order?.customerId ?? null;
        },
        errorMessage: 'You do not own this resource',
        statusCode: 403,
      }),
    ],
  },
});
```

## Audit Logging

Use the `after` middleware hook to log all payment activities:

```typescript
import { betterPay, requireAuth } from '@betterpay/core';
import type { SecurityMiddleware } from '@betterpay/core';

const auditLogger: SecurityMiddleware = async (ctx) => {
  // Log after successful request
  await db.auditLogs.create({
    userId: ctx.user?.id,
    action: ctx.request.method + ' ' + new URL(ctx.request.url).pathname,
    timestamp: new Date(),
    ip: ctx.request.headers.get('x-forwarded-for'),
    userAgent: ctx.request.headers.get('user-agent'),
    metadata: ctx.metadata,
  });
  
  return undefined; // Continue processing
};

const pay = betterPay({
  plugins: [/* ... */],
  middleware: {
    before: [
      requireAuth({
        auth: async (request) => {
          const session = await auth.getSession(request);
          return session?.user ?? null;
        },
      }),
    ],
    after: [auditLogger],
  },
});
```

## Complete Example

Here's a complete example combining all security features:

```typescript
import { betterPay, requireAuth, validateCSRF, requireRole, validateOwnership } from '@betterpay/core';
import { midtrans } from '@betterpay/midtrans';
import { billing, feature, plan } from '@betterpay/billing';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

// Define your plans
const messages = feature({ id: 'messages', type: 'metered' });
const pro = plan({
  id: 'pro',
  group: 'base',
  price: { amount: 199000, currency: 'IDR', interval: 'month' },
  includes: [messages({ limit: 5000, reset: 'month' })],
});

// Audit logging middleware
const auditLogger = async (ctx) => {
  await db.auditLogs.create({
    userId: ctx.user?.id,
    action: `${ctx.request.method} ${new URL(ctx.request.url).pathname}`,
    timestamp: new Date(),
    ip: ctx.request.headers.get('x-forwarded-for'),
    metadata: ctx.metadata,
  });
  return undefined;
};

// Custom error handler
const errorHandler = async (error, ctx) => {
  // Log error
  console.error('Payment error:', {
    error: error.message,
    userId: ctx.user?.id,
    requestId: ctx.metadata.requestId,
  });
  
  // Send to error tracking service
  await errorTracker.capture(error, {
    user: ctx.user,
    request: ctx.metadata,
  });
  
  // Return custom error response
  return new Response(JSON.stringify({
    error: 'An error occurred processing your payment',
    requestId: ctx.metadata.requestId,
  }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' },
  });
};

// Create BetterPay instance
export const pay = betterPay({
  plugins: [
    midtrans({
      serverKey: process.env.MIDTRANS_SERVER_KEY!,
      isSandbox: process.env.NODE_ENV !== 'production',
    }),
    billing({ products: [pro] }),
  ],
  
  middleware: {
    // Before request processing
    before: [
      // 1. CSRF protection
      validateCSRF({
        trustedOrigins: [
          'https://myapp.com',
          'https://*.myapp.com',
        ],
      }),
      
      // 2. Authentication
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
      
      // 3. Resource ownership (for specific endpoints)
      validateOwnership({
        getResourceOwnerId: async (ctx) => {
          const url = new URL(ctx.request.url);
          
          // Check subscription endpoints
          if (url.pathname.includes('/subscription/')) {
            const subscriptionId = url.pathname.split('/').pop();
            const sub = await db.subscriptions.findById(subscriptionId);
            return sub?.customerId ?? null;
          }
          
          // Check transaction endpoints
          if (url.pathname.includes('/status/')) {
            const orderId = url.pathname.split('/').pop();
            const order = await db.orders.findById(orderId);
            return order?.customerId ?? null;
          }
          
          return null;
        },
      }),
    ],
    
    // After request processing
    after: [auditLogger],
    
    // Custom error handler
    onError: errorHandler,
  },
});

// Next.js route handler
export async function GET(request: Request) {
  return pay.handler(request);
}

export async function POST(request: Request) {
  return pay.handler(request);
}
```

## Middleware Execution Order

Middlewares execute in the order they are defined:

```
Request
  ↓
[1] CSRF validation
  ↓
[2] Authentication
  ↓
[3] Authorization (role/ownership)
  ↓
[4] Request processing (router)
  ↓
[5] Audit logging
  ↓
Response
```

If any middleware returns a `Response`, the chain stops and that response is returned immediately.

## SecurityContext

The `SecurityContext` object is passed through all middlewares:

```typescript
interface SecurityContext {
  request: Request;
  user?: {
    id: string;
    email?: string;
    role?: string;
    [key: string]: unknown;
  };
  metadata: {
    requestId: string;
    startTime: number;
    [key: string]: unknown;
  };
}
```

Middlewares can:
- Read from `ctx.request`
- Set `ctx.user` (authentication middleware)
- Add data to `ctx.metadata`
- Return a `Response` to short-circuit the chain

## Best Practices

1. **Order matters**: Put CSRF first, then auth, then authorization
2. **Fail fast**: Return errors as early as possible
3. **Log everything**: Use `after` middleware for audit logging
4. **Custom errors**: Use `onError` to provide consistent error responses
5. **Don't expose internals**: Never include stack traces in production

## Learn More

- [Security Architecture](../ARCHITECTURE.md#security-middleware)
- [API Documentation](./API.md)
- [Example Applications](../examples/)
