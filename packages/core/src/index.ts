// ── @betterpay/core — Public exports ─────────────────────────────────────

// Plugin system
export type { PayContext } from './context';
export type { BetterPayPlugin, PayEndpoint, PayMiddleware, HookContext, RawError } from './plugin';

// Provider interface
export type {
  PaymentProvider,
  PaymentMethod,
  ProviderCapabilities,
  CreatePaymentLinkInput,
  PaymentLinkResult,
  StatusResult,
  WebhookData,
  NormalizedWebhookEvent,
} from './provider/interface';

// Provider registry
export { ProviderRegistry } from './provider/registry';

// Transaction
export type { TransactionRecord, TransactionStatus } from './transaction/schema';
export { VALID_TRANSITIONS, isValidTransition } from './transaction/schema';
export { TransactionService } from './transaction/service';
export type { TransactionRepository } from './transaction/service';

// Webhook
export { WebhookHandler } from './webhook/handler';
export type { WebhookResult } from './webhook/handler';

// Router
export { createPayRouter } from './router';

// Factory
export { betterPay } from './create-betterpay';
export type { BetterPayOptions, BetterPayInstance } from './create-betterpay';

// Utilities
export { CircuitBreaker, createCircuitBreaker } from './utils/circuit-breaker';
export type { CircuitState, CircuitBreakerOptions, CircuitBreakerStats } from './utils/circuit-breaker';
export { withRetry } from './utils/retry';
export type { RetryOptions } from './utils/retry';
export { generateOrderId, validateOrderId, validateAmount } from './utils/id';
