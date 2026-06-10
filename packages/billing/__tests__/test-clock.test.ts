import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestClock } from '../src/test-clock';

describe('TestClock', () => {
  let clock: TestClock;

  beforeEach(() => {
    clock = new TestClock({ enabled: true, defaultTime: new Date('2026-01-01T00:00:00Z') });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns default frozen time when no customer time set', () => {
    const time = clock.getTime('cust_1');
    expect(time.toISOString()).toBe('2026-01-01T00:00:00.000Z');
  });

  it('returns frozen time for specific customer', () => {
    clock.freeze('cust_1', new Date('2026-06-15T12:00:00Z'));
    expect(clock.getTime('cust_1').toISOString()).toBe('2026-06-15T12:00:00.000Z');
  });

  it('advance moves customer time forward', () => {
    clock.freeze('cust_1', new Date('2026-01-01T00:00:00Z'));
    clock.advance('cust_1', 31 * 24 * 60 * 60 * 1000); // 31 days → Feb 1
    const time = clock.getTime('cust_1');
    expect(time.getMonth()).toBe(1); // February
  });

  it('advanceAll moves all customer clocks', () => {
    clock.freeze('a', new Date('2026-01-01T00:00:00Z'));
    clock.freeze('b', new Date('2026-03-01T00:00:00Z'));
    clock.advanceAll(86400000); // 1 day
    expect(clock.getTime('a').getDate()).toBe(2);
    expect(clock.getTime('b').getDate()).toBe(2);
  });

  it('reset clears all frozen times', () => {
    clock.freeze('cust_1', new Date('2026-06-01T00:00:00Z'));
    clock.reset();
    // Falls back to default
    expect(clock.getTime('cust_1').toISOString()).toBe('2026-01-01T00:00:00.000Z');
  });

  it('disabled clock returns real time', () => {
    const disabled = new TestClock({ enabled: false });
    const time = disabled.getTime();
    expect(time.getFullYear()).toBe(new Date().getFullYear());
  });

  it('isEnabled returns correct state', () => {
    expect(clock.isEnabled()).toBe(true);
    const disabled = new TestClock({ enabled: false });
    expect(disabled.isEnabled()).toBe(false);
  });

  it('disabled clock ignores freeze and advance', () => {
    const disabled = new TestClock({ enabled: false });
    disabled.freeze('cust_1', new Date('2020-01-01T00:00:00Z'));
    disabled.advance('cust_1', 999999999);
    // Should still return real time
    expect(disabled.getTime('cust_1').getFullYear()).toBe(new Date().getFullYear());
  });
});
