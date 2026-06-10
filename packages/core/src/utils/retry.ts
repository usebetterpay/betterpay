// ── Retry with exponential backoff + full jitter ──────────────────────────
// Extracted from wabase payment-gateway.

export interface RetryOptions {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  jitter: boolean;
}

export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30_000,
  jitter: true,
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function calculateDelay(attempt: number, baseMs: number, maxMs: number, jitter: boolean): number {
  const exponential = baseMs * 2 ** attempt;
  const capped = Math.min(exponential, maxMs);
  return jitter ? Math.random() * capped : capped;
}

/**
 * Retry `fn` with exponential backoff + optional full jitter.
 * Non-retryable errors are thrown immediately.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {},
): Promise<T> {
  const { maxAttempts, baseDelayMs, maxDelayMs, jitter } = {
    ...DEFAULT_RETRY_OPTIONS,
    ...options,
  };

  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === maxAttempts - 1) break;
      // Only retry retryable errors
      if (error instanceof Error && !isRetryable(error)) break;
      await sleep(calculateDelay(attempt, baseDelayMs, maxDelayMs, jitter));
    }
  }

  throw lastError;
}

/** Heuristic: network/timeout errors are retryable. */
function isRetryable(error: Error): boolean {
  const msg = error.message.toLowerCase();
  return (
    msg.includes('network') ||
    msg.includes('timeout') ||
    msg.includes('econnrefused') ||
    msg.includes('econnreset') ||
    msg.includes('etimedout') ||
    msg.includes('circuit breaker')
  );
}
