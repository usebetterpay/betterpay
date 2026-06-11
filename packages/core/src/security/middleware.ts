// Security Middleware System
// Provides hooks for user apps to inject authentication, CSRF, and authorization logic

export interface SecurityContext {
  request: Request;
  user?: {
    id: string;
    email?: string;
    role?: string;
    [key: string]: unknown;
  };
  metadata: Record<string, unknown>;
}

export type SecurityMiddleware = (
  ctx: SecurityContext
) => Promise<Response | void> | Response | void;

export interface SecurityMiddlewareOptions {
  before?: SecurityMiddleware[];
  after?: SecurityMiddleware[];
  onError?: (error: Error, ctx: SecurityContext) => Response | void | Promise<Response | void>;
}

/**
 * Execute middleware chain
 */
export async function executeMiddlewareChain(
  middlewares: SecurityMiddleware[],
  ctx: SecurityContext
): Promise<Response | null> {
  for (const middleware of middlewares) {
    try {
      const result = await middleware(ctx);
      if (result instanceof Response) {
        return result; // Early return (e.g., auth failure)
      }
    } catch (error) {
      // Middleware threw error
      throw error;
    }
  }
  return null; // All middlewares passed
}

/**
 * Require authentication middleware
 * User app provides auth function to integrate with their auth system
 */
export function requireAuth(options: {
  auth: (request: Request) => Promise<SecurityContext['user'] | null>;
  errorMessage?: string;
  statusCode?: number;
}): SecurityMiddleware {
  const { auth, errorMessage = 'Unauthorized', statusCode = 401 } = options;

  return async (ctx: SecurityContext) => {
    const user = await auth(ctx.request);
    
    if (!user) {
      return new Response(JSON.stringify({ error: errorMessage }), {
        status: statusCode,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Inject user into context
    ctx.user = user;
    return undefined;
  };
}

/**
 * CSRF protection middleware
 * Validates Origin header against trusted origins
 */
export function validateCSRF(options: {
  trustedOrigins: string[];
  errorMessage?: string;
  statusCode?: number;
}): SecurityMiddleware {
  const { trustedOrigins, errorMessage = 'Invalid origin', statusCode = 403 } = options;

  return (ctx: SecurityContext) => {
    const origin = ctx.request.headers.get('origin');
    
    // Skip for same-origin requests or non-browser requests
    if (!origin) {
      return undefined;
    }

    // Check if origin is trusted
    const isTrusted = trustedOrigins.some(trusted => {
      if (trusted === origin) return true;
      
      // Handle wildcard patterns (e.g., 'https://*.myapp.com')
      if (trusted.includes('*')) {
        // Convert wildcard pattern to regex
        const regexPattern = trusted
          .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // Escape special regex chars except *
          .replace(/\*/g, '.*'); // Replace * with .*
        const regex = new RegExp(`^${regexPattern}$`);
        return regex.test(origin);
      }
      
      return false;
    });

    if (!isTrusted) {
      return new Response(JSON.stringify({ error: errorMessage }), {
        status: statusCode,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    return undefined;
  };
}

/**
 * Rate limiting middleware wrapper
 * Uses the existing RateLimiter from security/rate-limiter.ts
 */
export function rateLimit(options: {
  limiter: import('./rate-limiter').RateLimiter;
  keyGenerator?: (ctx: SecurityContext) => string;
  errorMessage?: string;
  statusCode?: number;
}): SecurityMiddleware {
  const { 
    limiter, 
    keyGenerator = (ctx) => ctx.request.headers.get('x-forwarded-for') || 'anonymous',
    errorMessage = 'Rate limit exceeded',
    statusCode = 429 
  } = options;

  return (ctx: SecurityContext) => {
    const key = keyGenerator(ctx);
    const result = limiter.check(key);

    if (!result.allowed) {
      return new Response(JSON.stringify({ 
        error: errorMessage,
        retryAfter: result.retryAfterMs ?? 0 
      }), {
        status: statusCode,
        headers: { 
          'Content-Type': 'application/json',
          'Retry-After': String(Math.ceil((result.retryAfterMs ?? 0) / 1000))
        },
      });
    }
    
    return undefined;
  };
}

/**
 * Require specific role middleware
 * Must be used after requireAuth
 */
export function requireRole(options: {
  roles: string[];
  errorMessage?: string;
  statusCode?: number;
}): SecurityMiddleware {
  const { roles, errorMessage = 'Forbidden', statusCode = 403 } = options;

  return (ctx: SecurityContext) => {
    if (!ctx.user) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!ctx.user.role || !roles.includes(ctx.user.role)) {
      return new Response(JSON.stringify({ error: errorMessage }), {
        status: statusCode,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    return undefined;
  };
}

/**
 * Resource ownership validation middleware
 * Validates that user owns the resource they're trying to access
 */
export function validateOwnership(options: {
  getResourceOwnerId: (ctx: SecurityContext) => Promise<string | null>;
  errorMessage?: string;
  statusCode?: number;
}): SecurityMiddleware {
  const { getResourceOwnerId, errorMessage = 'Forbidden', statusCode = 403 } = options;

  return async (ctx: SecurityContext) => {
    if (!ctx.user) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const ownerId = await getResourceOwnerId(ctx);
    
    if (!ownerId || ownerId !== ctx.user.id) {
      return new Response(JSON.stringify({ error: errorMessage }), {
        status: statusCode,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    return undefined;
  };
}
