// ── Test clock for billing time simulation ──────────────────────────────────
// Allows tests to advance time without real delays.
// Stores a frozen timestamp per customer; services use getCustomerCurrentTime()
// instead of new Date() when test clock is active.

import type { BetterPayPlugin } from '@betterpay/core';

export interface TestClockConfig {
  /** Enable test clock (gated by env in production). */
  enabled: boolean;
  /** Default frozen time if not per-customer. */
  defaultTime?: Date;
}

export class TestClock {
  private enabled: boolean;
  private customerTimes = new Map<string, Date>();
  private defaultTime: Date | null;

  constructor(config: TestClockConfig) {
    this.enabled = config.enabled;
    this.defaultTime = config.defaultTime ?? null;
  }

  /** Freeze time for a specific customer. */
  freeze(customerId: string, time: Date): void {
    if (!this.enabled) return;
    this.customerTimes.set(customerId, time);
  }

  /** Advance frozen time by the given milliseconds. */
  advance(customerId: string, ms: number): void {
    if (!this.enabled) return;
    const current = this.customerTimes.get(customerId) ?? this.defaultTime ?? new Date();
    this.customerTimes.set(customerId, new Date(current.getTime() + ms));
  }

  /** Advance ALL customer clocks by the given milliseconds. */
  advanceAll(ms: number): void {
    if (!this.enabled) return;
    for (const [id, time] of this.customerTimes) {
      this.customerTimes.set(id, new Date(time.getTime() + ms));
    }
  }

  /** Get the current time for a customer (frozen or real). */
  getTime(customerId?: string): Date {
    if (!this.enabled) return new Date();
    if (customerId) {
      const frozen = this.customerTimes.get(customerId);
      if (frozen) return frozen;
    }
    return this.defaultTime ?? new Date();
  }

  /** Reset all frozen times. */
  reset(): void {
    this.customerTimes.clear();
  }

  /** Check if test clock is active. */
  isEnabled(): boolean {
    return this.enabled;
  }
}

/**
 * Create a test clock plugin for BetterPay.
 * Only active when `enabled: true` (gated by env).
 *
 * @example
 * ```ts
 * const pay = betterPay({
 *   plugins: [
 *     midtrans({ ... }),
 *     billing({ products: [...] }),
 *     testClock({ enabled: process.env.NODE_ENV === 'test' }),
 *   ],
 * });
 * ```
 */
export function testClock(config: TestClockConfig): BetterPayPlugin {
  const clock = new TestClock(config);

  return {
    id: 'test-clock',
    version: '0.1.0',
    $Infer: { testClock: clock },
    $ERROR_CODES: {},
  };
}
