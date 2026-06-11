import { describe, it, expect, vi } from 'vitest';
import {
  executeMiddlewareChain,
  requireAuth,
  validateCSRF,
  rateLimit,
  requireRole,
  validateOwnership,
} from '../../src/security/middleware';
import type { SecurityContext, SecurityMiddleware } from '../../src/security/middleware';

describe('Security Middleware', () => {
  describe('executeMiddlewareChain', () => {
    it('should execute all middlewares in order', async () => {
      const order: number[] = [];
      const middlewares: SecurityMiddleware[] = [
        async () => { order.push(1); },
        async () => { order.push(2); },
        async () => { order.push(3); },
      ];

      const ctx: SecurityContext = {
        request: new Request('http://localhost/test'),
        metadata: {},
      };

      await executeMiddlewareChain(middlewares, ctx);
      expect(order).toEqual([1, 2, 3]);
    });

    it('should stop execution when middleware returns Response', async () => {
      const order: number[] = [];
      const middlewares: SecurityMiddleware[] = [
        async () => { order.push(1); },
        async () => {
          order.push(2);
          return new Response('blocked', { status: 403 });
        },
        async () => { order.push(3); },
      ];

      const ctx: SecurityContext = {
        request: new Request('http://localhost/test'),
        metadata: {},
      };

      const result = await executeMiddlewareChain(middlewares, ctx);
      expect(order).toEqual([1, 2]);
      expect(result?.status).toBe(403);
    });

    it('should return null when all middlewares pass', async () => {
      const middlewares: SecurityMiddleware[] = [
        async () => {},
        async () => {},
      ];

      const ctx: SecurityContext = {
        request: new Request('http://localhost/test'),
        metadata: {},
      };

      const result = await executeMiddlewareChain(middlewares, ctx);
      expect(result).toBeNull();
    });
  });

  describe('requireAuth', () => {
    it('should allow authenticated requests', async () => {
      const middleware = requireAuth({
        auth: async () => ({ id: 'user_123', email: 'test@example.com' }),
      });

      const ctx: SecurityContext = {
        request: new Request('http://localhost/test'),
        metadata: {},
      };

      const result = await middleware(ctx);
      expect(result).toBeUndefined();
      expect(ctx.user?.id).toBe('user_123');
    });

    it('should block unauthenticated requests', async () => {
      const middleware = requireAuth({
        auth: async () => null,
      });

      const ctx: SecurityContext = {
        request: new Request('http://localhost/test'),
        metadata: {},
      };

      const result = await middleware(ctx);
      expect(result).toBeInstanceOf(Response);
      expect(result?.status).toBe(401);
    });

    it('should use custom error message', async () => {
      const middleware = requireAuth({
        auth: async () => null,
        errorMessage: 'Please login',
        statusCode: 403,
      });

      const ctx: SecurityContext = {
        request: new Request('http://localhost/test'),
        metadata: {},
      };

      const result = await middleware(ctx);
      expect(result?.status).toBe(403);
      const body = await result?.json();
      expect(body.error).toBe('Please login');
    });
  });

  describe('validateCSRF', () => {
    it('should allow requests without origin header', async () => {
      const middleware = validateCSRF({
        trustedOrigins: ['https://myapp.com'],
      });

      const ctx: SecurityContext = {
        request: new Request('http://localhost/test'),
        metadata: {},
      };

      const result = await middleware(ctx);
      expect(result).toBeUndefined();
    });

    it('should allow requests from trusted origins', async () => {
      const middleware = validateCSRF({
        trustedOrigins: ['https://myapp.com', 'https://admin.myapp.com'],
      });

      const ctx: SecurityContext = {
        request: new Request('http://localhost/test', {
          headers: { origin: 'https://myapp.com' },
        }),
        metadata: {},
      };

      const result = await middleware(ctx);
      expect(result).toBeUndefined();
    });

    it('should block requests from untrusted origins', async () => {
      const middleware = validateCSRF({
        trustedOrigins: ['https://myapp.com'],
      });

      const ctx: SecurityContext = {
        request: new Request('http://localhost/test', {
          headers: { origin: 'https://evil.com' },
        }),
        metadata: {},
      };

      const result = await middleware(ctx);
      expect(result).toBeInstanceOf(Response);
      expect(result?.status).toBe(403);
    });

    it('should support wildcard origins', async () => {
      const middleware = validateCSRF({
        trustedOrigins: ['https://*.myapp.com'],
      });

      const ctx: SecurityContext = {
        request: new Request('http://localhost/test', {
          headers: { origin: 'https://admin.myapp.com' },
        }),
        metadata: {},
      };

      const result = await middleware(ctx);
      expect(result).toBeUndefined();
    });
  });

  describe('rateLimit', () => {
    it('should allow requests within limit', async () => {
      const mockLimiter = {
        check: vi.fn().mockReturnValue({ allowed: true, remaining: 99, resetAt: new Date() }),
      };

      const middleware = rateLimit({ limiter: mockLimiter as any });

      const ctx: SecurityContext = {
        request: new Request('http://localhost/test'),
        metadata: {},
      };

      const result = await middleware(ctx);
      expect(result).toBeUndefined();
      expect(mockLimiter.check).toHaveBeenCalled();
    });

    it('should block requests exceeding limit', async () => {
      const mockLimiter = {
        check: vi.fn().mockReturnValue({ allowed: false, retryAfterMs: 60000 }),
      };

      const middleware = rateLimit({ limiter: mockLimiter as any });

      const ctx: SecurityContext = {
        request: new Request('http://localhost/test'),
        metadata: {},
      };

      const result = await middleware(ctx);
      expect(result).toBeInstanceOf(Response);
      expect(result?.status).toBe(429);
      expect(result?.headers.get('Retry-After')).toBe('60');
    });

    it('should use custom key generator', async () => {
      const mockLimiter = {
        check: vi.fn().mockReturnValue({ allowed: true }),
      };

      const middleware = rateLimit({
        limiter: mockLimiter as any,
        keyGenerator: (ctx) => ctx.user?.id || 'anonymous',
      });

      const ctx: SecurityContext = {
        request: new Request('http://localhost/test'),
        user: { id: 'user_123' },
        metadata: {},
      };

      await middleware(ctx);
      expect(mockLimiter.check).toHaveBeenCalledWith('user_123');
    });
  });

  describe('requireRole', () => {
    it('should allow users with required role', async () => {
      const middleware = requireRole({ roles: ['admin', 'manager'] });

      const ctx: SecurityContext = {
        request: new Request('http://localhost/test'),
        user: { id: 'user_123', role: 'admin' },
        metadata: {},
      };

      const result = await middleware(ctx);
      expect(result).toBeUndefined();
    });

    it('should block users without required role', async () => {
      const middleware = requireRole({ roles: ['admin'] });

      const ctx: SecurityContext = {
        request: new Request('http://localhost/test'),
        user: { id: 'user_123', role: 'user' },
        metadata: {},
      };

      const result = await middleware(ctx);
      expect(result).toBeInstanceOf(Response);
      expect(result?.status).toBe(403);
    });

    it('should require authentication first', async () => {
      const middleware = requireRole({ roles: ['admin'] });

      const ctx: SecurityContext = {
        request: new Request('http://localhost/test'),
        metadata: {},
      };

      const result = await middleware(ctx);
      expect(result).toBeInstanceOf(Response);
      expect(result?.status).toBe(401);
    });
  });

  describe('validateOwnership', () => {
    it('should allow resource owners', async () => {
      const middleware = validateOwnership({
        getResourceOwnerId: async () => 'user_123',
      });

      const ctx: SecurityContext = {
        request: new Request('http://localhost/test'),
        user: { id: 'user_123' },
        metadata: {},
      };

      const result = await middleware(ctx);
      expect(result).toBeUndefined();
    });

    it('should block non-owners', async () => {
      const middleware = validateOwnership({
        getResourceOwnerId: async () => 'user_456',
      });

      const ctx: SecurityContext = {
        request: new Request('http://localhost/test'),
        user: { id: 'user_123' },
        metadata: {},
      };

      const result = await middleware(ctx);
      expect(result).toBeInstanceOf(Response);
      expect(result?.status).toBe(403);
    });

    it('should require authentication first', async () => {
      const middleware = validateOwnership({
        getResourceOwnerId: async () => 'user_123',
      });

      const ctx: SecurityContext = {
        request: new Request('http://localhost/test'),
        metadata: {},
      };

      const result = await middleware(ctx);
      expect(result).toBeInstanceOf(Response);
      expect(result?.status).toBe(401);
    });
  });
});
