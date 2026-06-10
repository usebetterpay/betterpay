import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CircuitBreaker, createCircuitBreaker } from '../src/utils/circuit-breaker';

describe('CircuitBreaker', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should start in closed state', () => {
    const cb = createCircuitBreaker();
    expect(cb.getState()).toBe('closed');
  });

  it('should pass requests through when closed', async () => {
    const cb = createCircuitBreaker({ failureThreshold: 3 });
    const fn = vi.fn().mockResolvedValue('ok');

    const result = await cb.execute(fn);

    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledOnce();
  });

  it('should open circuit after reaching failure threshold', async () => {
    const cb = createCircuitBreaker({ failureThreshold: 3, resetTimeoutMs: 60000 });
    const error = new Error('fail');
    const fn = vi.fn().mockRejectedValue(error);

    for (let i = 0; i < 3; i++) {
      await expect(cb.execute(fn)).rejects.toThrow('fail');
    }

    expect(cb.getState()).toBe('open');

    // Next call should fail immediately without calling fn
    fn.mockClear();
    await expect(cb.execute(fn)).rejects.toThrow('Circuit breaker is open');
    expect(fn).not.toHaveBeenCalled();
  });

  it('should transition to half-open after reset timeout', async () => {
    const cb = createCircuitBreaker({ failureThreshold: 2, resetTimeoutMs: 5000 });
    const fn = vi.fn().mockRejectedValue(new Error('fail'));

    // Open the circuit
    for (let i = 0; i < 2; i++) {
      await expect(cb.execute(fn)).rejects.toThrow('fail');
    }
    expect(cb.getState()).toBe('open');

    // Advance time past reset timeout
    vi.advanceTimersByTime(6000);

    // Should now be half-open and allow one request
    fn.mockResolvedValue('recovered');
    const result = await cb.execute(fn);
    expect(result).toBe('recovered');
  });

  it('should close circuit after successful half-open requests', async () => {
    const cb = createCircuitBreaker({
      failureThreshold: 2,
      successThreshold: 2,
      resetTimeoutMs: 5000,
    });

    // Open the circuit
    for (let i = 0; i < 2; i++) {
      await expect(cb.execute(vi.fn().mockRejectedValue(new Error('fail')))).rejects.toThrow();
    }
    expect(cb.getState()).toBe('open');

    // Advance past reset timeout
    vi.advanceTimersByTime(6000);

    // Two successes should close the circuit
    const fn = vi.fn().mockResolvedValue('ok');
    await cb.execute(fn);
    await cb.execute(fn);

    expect(cb.getState()).toBe('closed');
  });

  it('should re-open circuit on failure in half-open state', async () => {
    const cb = createCircuitBreaker({
      failureThreshold: 1,
      resetTimeoutMs: 5000,
    });

    // Open the circuit
    await expect(cb.execute(vi.fn().mockRejectedValue(new Error('fail')))).rejects.toThrow();
    expect(cb.getState()).toBe('open');

    // Advance past reset timeout
    vi.advanceTimersByTime(6000);

    // Fail in half-open
    await expect(cb.execute(vi.fn().mockRejectedValue(new Error('fail again')))).rejects.toThrow();
    expect(cb.getState()).toBe('open');
  });

  it('should not count non-retryable errors as failures', async () => {
    const cb = createCircuitBreaker({
      failureThreshold: 2,
      isFailure: (error: unknown) => {
        if (error instanceof Error && error.message === 'validation') return false;
        return true;
      },
    });

    const fn = vi.fn().mockRejectedValue(new Error('validation'));

    await expect(cb.execute(fn)).rejects.toThrow('validation');
    await expect(cb.execute(fn)).rejects.toThrow('validation');
    await expect(cb.execute(fn)).rejects.toThrow('validation');

    // Should still be closed because validation errors don't count
    expect(cb.getState()).toBe('closed');
  });

  it('should provide stats', async () => {
    const cb = createCircuitBreaker({ failureThreshold: 3 });
    const stats = cb.getStats();

    expect(stats.state).toBe('closed');
    expect(stats.failures).toBe(0);
    expect(stats.successes).toBe(0);
    expect(stats.lastFailureTime).toBeNull();
    expect(stats.nextAttemptTime).toBeNull();
  });

  it('should support manual reset', async () => {
    const cb = createCircuitBreaker({ failureThreshold: 1 });

    // Open the circuit
    await expect(cb.execute(vi.fn().mockRejectedValue(new Error('fail')))).rejects.toThrow();
    expect(cb.getState()).toBe('open');

    // Manual reset
    cb.reset();
    expect(cb.getState()).toBe('closed');
  });
});
