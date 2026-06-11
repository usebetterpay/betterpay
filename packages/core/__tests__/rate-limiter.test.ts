import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RateLimiter, createRateLimiter } from '../src/security/rate-limiter';

describe('RateLimiter', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    vi.useFakeTimers();
    limiter = new RateLimiter({ windowMs: 60000, max: 3, keyPrefix: 'test' });
  });

  afterEach(() => {
    limiter.destroy();
    vi.useRealTimers();
  });

  it('should allow requests within limit', () => {
    const result1 = limiter.check('user1');
    expect(result1.allowed).toBe(true);
    expect(result1.remaining).toBe(2);

    const result2 = limiter.check('user1');
    expect(result2.allowed).toBe(true);
    expect(result2.remaining).toBe(1);

    const result3 = limiter.check('user1');
    expect(result3.allowed).toBe(true);
    expect(result3.remaining).toBe(0);
  });

  it('should block requests exceeding limit', () => {
    limiter.check('user1');
    limiter.check('user1');
    limiter.check('user1');

    const result = limiter.check('user1');
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfterMs).toBeDefined();
  });

  it('should track different keys separately', () => {
    limiter.check('user1');
    limiter.check('user1');
    limiter.check('user1');

    // user2 should still have quota
    const result = limiter.check('user2');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it('should reset after window expires', () => {
    limiter.check('user1');
    limiter.check('user1');
    limiter.check('user1');

    // Advance time past window
    vi.advanceTimersByTime(61000);

    const result = limiter.check('user1');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it('should reset specific key', () => {
    limiter.check('user1');
    limiter.check('user1');
    limiter.check('user1');

    limiter.reset('user1');

    const result = limiter.check('user1');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it('should return stats', () => {
    limiter.check('user1');
    limiter.check('user1');

    const stats = limiter.getStats('user1');
    expect(stats).toEqual({
      count: 2,
      limit: 3,
      resetAt: expect.any(Date),
    });
  });

  it('should return null stats for unknown key', () => {
    const stats = limiter.getStats('unknown');
    expect(stats).toBeNull();
  });
});

describe('createRateLimiter', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('should create api preset', () => {
    const limiter = createRateLimiter('api');
    expect(limiter).toBeInstanceOf(RateLimiter);
    limiter.destroy();
  });

  it('should create webhook preset', () => {
    const limiter = createRateLimiter('webhook');
    expect(limiter).toBeInstanceOf(RateLimiter);
    limiter.destroy();
  });

  it('should create auth preset', () => {
    const limiter = createRateLimiter('auth');
    expect(limiter).toBeInstanceOf(RateLimiter);
    limiter.destroy();
  });

  it('should create custom config', () => {
    const limiter = createRateLimiter({
      windowMs: 10000,
      max: 5,
      keyPrefix: 'custom',
    });
    expect(limiter).toBeInstanceOf(RateLimiter);
    limiter.destroy();
  });
});
