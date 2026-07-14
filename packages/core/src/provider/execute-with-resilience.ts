// ── Execute provider calls with retry + circuit breaker + optional failover ─
// Used by createTransaction (factory + router). Failover is opt-in only
// (create-link failures before the customer pays — never mid-payment).

import type { PaymentProvider, CreatePaymentLinkInput, PaymentLinkResult } from './interface';
import { ProviderRegistry } from './registry';
import { createCircuitBreaker, type CircuitBreaker } from '../utils/circuit-breaker';
import { withRetry, type RetryOptions } from '../utils/retry';

export interface ResilienceOptions {
  /** Opt-in: try next provider by priority after retries exhausted. Default false. */
  failover?: boolean;
  retry?: Partial<RetryOptions>;
  /** Shared map of breakers keyed by provider id (one per process/factory). */
  breakers: Map<string, CircuitBreaker>;
}

function getBreaker(breakers: Map<string, CircuitBreaker>, providerId: string): CircuitBreaker {
  let cb = breakers.get(providerId);
  if (!cb) {
    cb = createCircuitBreaker({
      failureThreshold: 5,
      successThreshold: 2,
      resetTimeoutMs: 60_000,
    });
    breakers.set(providerId, cb);
  }
  return cb;
}

/** Errors that should not burn circuit / retry budget (validation). */
export function isNonRetryableProviderError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return (
    msg.includes('validation') ||
    msg.includes('invalid') ||
    msg.includes('not found') ||
    msg.includes('unauthorized') ||
    msg.includes('forbidden')
  );
}

/**
 * Call createPaymentLink with per-provider circuit breaker + retry.
 * Optionally fail over to the next priority provider if `failover` is true.
 */
export async function createPaymentLinkWithResilience(
  registry: ProviderRegistry,
  input: CreatePaymentLinkInput & { providerId?: string },
  options: ResilienceOptions,
): Promise<{ provider: PaymentProvider; result: PaymentLinkResult }> {
  const candidates = registry.listForCreate({
    providerId: input.providerId,
    paymentMethod: input.paymentMethod as any,
    failover: options.failover === true,
  });

  if (candidates.length === 0) {
    throw new Error('No provider available');
  }

  const retryOpts: Partial<RetryOptions> = {
    maxAttempts: 3,
    baseDelayMs: 50, // short default; callers can override for prod
    maxDelayMs: 5_000,
    jitter: true,
    ...options.retry,
  };

  let lastError: unknown;

  for (const provider of candidates) {
    const breaker = getBreaker(options.breakers, provider.id);
    try {
      const result = await withRetry(
        () =>
          breaker.execute(() =>
            provider.createPaymentLink({
              orderId: input.orderId,
              amount: input.amount,
              currency: input.currency,
              customerEmail: input.customerEmail,
              customerName: input.customerName,
              customerPhone: input.customerPhone,
              description: input.description,
              callbackUrl: input.callbackUrl,
              returnUrl: input.returnUrl,
              paymentMethod: input.paymentMethod,
              items: input.items,
              metadata: input.metadata,
              expiryMinutes: input.expiryMinutes,
            }),
          ),
        {
          ...retryOpts,
          // withRetry already filters; wrap non-retryable as immediate throw inside
        },
      );
      return { provider, result };
    } catch (error) {
      lastError = error;
      // Non-retryable / validation: stop entirely (do not fail over)
      if (isNonRetryableProviderError(error)) {
        throw error;
      }
      // Failover only when enabled and more candidates remain
      if (!options.failover || candidates[candidates.length - 1] === provider) {
        throw error;
      }
      // else continue to next provider
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
