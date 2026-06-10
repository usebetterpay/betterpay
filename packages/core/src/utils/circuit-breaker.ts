// ── Circuit Breaker ────────────────────────────────────────────────────────
// Extracted from wabase payment-gateway, made standalone (no PaymentError dep).
// States: closed → open → half-open → closed (or back to open)

export type CircuitState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerOptions {
  /** Number of failures before opening circuit. */
  failureThreshold: number;
  /** Number of consecutive successes in half-open before closing. */
  successThreshold: number;
  /** Time in ms before attempting to transition open → half-open. */
  resetTimeoutMs: number;
  /** Custom function to decide if an error counts as a failure. */
  isFailure?: (error: unknown) => boolean;
}

export const DEFAULT_CIRCUIT_BREAKER_OPTIONS: CircuitBreakerOptions = {
  failureThreshold: 5,
  successThreshold: 2,
  resetTimeoutMs: 60_000,
  isFailure: () => true,
};

export interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime: number | null;
  nextAttemptTime: number | null;
}

export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failures = 0;
  private successes = 0;
  private lastFailureTime: number | null = null;
  private nextAttemptTime: number | null = null;

  constructor(private readonly options: CircuitBreakerOptions) {}

  /** Execute `fn` through the circuit breaker. */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      const now = Date.now();
      if (this.nextAttemptTime !== null && now < this.nextAttemptTime) {
        throw new Error('Circuit breaker is open');
      }
      // Transition to half-open
      this.state = 'half-open';
      this.successes = 0;
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime,
    };
  }

  /** Manually reset to closed state. */
  reset(): void {
    this.state = 'closed';
    this.failures = 0;
    this.successes = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;
  }

  // ── Private ────────────────────────────────────────────────────────────

  private onSuccess(): void {
    if (this.state === 'half-open') {
      this.successes++;
      if (this.successes >= this.options.successThreshold) {
        this.state = 'closed';
        this.failures = 0;
        this.successes = 0;
        this.lastFailureTime = null;
        this.nextAttemptTime = null;
      }
    } else {
      this.failures = 0;
    }
  }

  private onFailure(error: unknown): void {
    const isFailure = this.options.isFailure ?? (() => true);
    if (!isFailure(error)) return;

    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.state === 'half-open') {
      this.open();
    } else if (this.state === 'closed' && this.failures >= this.options.failureThreshold) {
      this.open();
    }
  }

  private open(): void {
    this.state = 'open';
    this.successes = 0;
    this.nextAttemptTime = Date.now() + this.options.resetTimeoutMs;
  }
}

/** Create a circuit breaker with merged default options. */
export function createCircuitBreaker(
  options: Partial<CircuitBreakerOptions> = {},
): CircuitBreaker {
  return new CircuitBreaker({ ...DEFAULT_CIRCUIT_BREAKER_OPTIONS, ...options });
}
