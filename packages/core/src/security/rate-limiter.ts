// Rate Limiting - In-memory implementation
// Prevents DoS attacks with per-endpoint limits

export interface RateLimitConfig {
  /** Time window in milliseconds */
  windowMs: number;
  /** Maximum requests per window */
  max: number;
  /** Key prefix for grouping (default: 'global') */
  keyPrefix?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfterMs?: number;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export class RateLimiter {
  private entries = new Map<string, RateLimitEntry>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(private config: RateLimitConfig) {
    // Cleanup expired entries every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Check if request is allowed and consume one token.
   */
  check(key: string): RateLimitResult {
    const fullKey = `${this.config.keyPrefix || 'global'}:${key}`;
    const now = Date.now();
    let entry = this.entries.get(fullKey);

    // Create or reset entry if expired
    if (!entry || now > entry.resetAt) {
      entry = {
        count: 0,
        resetAt: now + this.config.windowMs,
      };
      this.entries.set(fullKey, entry);
    }

    // Check if limit exceeded
    if (entry.count >= this.config.max) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(entry.resetAt),
        retryAfterMs: entry.resetAt - now,
      };
    }

    // Consume one token
    entry.count++;

    return {
      allowed: true,
      remaining: this.config.max - entry.count,
      resetAt: new Date(entry.resetAt),
    };
  }

  /**
   * Reset counter for a specific key.
   */
  reset(key: string): void {
    const fullKey = `${this.config.keyPrefix || 'global'}:${key}`;
    this.entries.delete(fullKey);
  }

  /**
   * Get current stats for a key.
   */
  getStats(key: string): { count: number; limit: number; resetAt: Date } | null {
    const fullKey = `${this.config.keyPrefix || 'global'}:${key}`;
    const entry = this.entries.get(fullKey);
    if (!entry) return null;

    return {
      count: entry.count,
      limit: this.config.max,
      resetAt: new Date(entry.resetAt),
    };
  }

  /**
   * Remove expired entries to prevent memory leaks.
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.entries) {
      if (now > entry.resetAt) {
        this.entries.delete(key);
      }
    }
  }

  /**
   * Stop cleanup interval (for testing/cleanup).
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.entries.clear();
  }
}

/**
 * Create rate limiter with common presets.
 */
export function createRateLimiter(preset: 'api' | 'webhook' | 'auth' | RateLimitConfig): RateLimiter {
  const configs: Record<string, RateLimitConfig> = {
    api: { windowMs: 60000, max: 100, keyPrefix: 'api' }, // 100 req/min
    webhook: { windowMs: 60000, max: 1000, keyPrefix: 'webhook' }, // 1000 req/min
    auth: { windowMs: 300000, max: 5, keyPrefix: 'auth' }, // 5 req/5min
  };

  const config = typeof preset === 'string' ? configs[preset] : preset;
  return new RateLimiter(config);
}

/**
 * Express/Koa middleware wrapper.
 */
export function rateLimitMiddleware(
  limiter: RateLimiter,
  keyGenerator: (req: any) => string = (req) => req.ip || 'unknown',
) {
  return (req: any, res: any, next: any) => {
    const key = keyGenerator(req);
    const result = limiter.check(key);

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', limiter['config'].max);
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Reset', Math.floor(result.resetAt.getTime() / 1000));

    if (!result.allowed) {
      res.setHeader('Retry-After', Math.ceil(result.retryAfterMs! / 1000));
      res.status(429).json({
        error: 'Too many requests',
        retryAfterMs: result.retryAfterMs,
      });
      return;
    }

    next();
  };
}
