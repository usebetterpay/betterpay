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
export {
  ISO_4217_DECIMALS,
  getCurrencyDecimals,
  toMinorUnits,
  fromMinorUnits,
  formatCurrency,
} from './utils/currency';
export {
  detectEndpointConflicts,
  validateEndpointPatterns,
  generateEndpointDocs,
} from './utils/endpoint-conflict';
export type { EndpointDefinition, EndpointConflict } from './utils/endpoint-conflict';

// Billing bridge (structural types for billing plugin integration)
export type {
  BillingPluginData,
  BillingFeatureInclude,
  BillingPlanDef,
  BillingNormalizedPlan,
  BillingSubscriptionHandle,
  BillingEntitlementHandle,
  BillingCustomerHandle,
  BillingInvoiceHandle,
  BillingCycleHandle,
} from './billing-bridge';

// Security
export {
  validateTimestamp,
  parseTimestampHeader,
  createTimestampHeader,
} from './webhook/replay-protection';
export type { ReplayProtectionOptions, WebhookTimestamp } from './webhook/replay-protection';

export { RateLimiter, createRateLimiter, rateLimitMiddleware } from './security/rate-limiter';
export type { RateLimitConfig, RateLimitResult } from './security/rate-limiter';

export {
  CredentialEncryption,
  createCredentialEncryption,
  validateMasterKey,
} from './security/credential-encryption';
export type { EncryptedValue } from './security/credential-encryption';

export {
  DefaultCredentialStore,
  InMemoryCredentialRepository,
  NullCredentialStore,
} from './security/credential-store';
export type {
  CredentialStore,
  CredentialRecord,
  CredentialRepository,
} from './security/credential-store';

export { schemas, validateInput, validateInputStrict, validationMiddleware } from './security/input-validation';

export {
  executeMiddlewareChain,
  requireAuth,
  validateCSRF,
  rateLimit,
  requireRole,
  validateOwnership,
} from './security/middleware';
export type {
  SecurityContext,
  SecurityMiddleware,
  SecurityMiddlewareOptions,
} from './security/middleware';

// Errors
export {
  BetterPayError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  RateLimitError,
  ProviderError,
  WebhookError,
  BillingError,
  DunningError,
  ReconciliationError,
  EncryptionError,
  MigrationError,
  toBetterPayError,
  isRetryableError,
} from './errors/betterpay-error';
export type { ErrorCode, BetterPayErrorOptions } from './errors/betterpay-error';

// Reconciliation
export {
  ReconciliationWorker,
  createReconciliationWorker,
} from './reconciliation/reconciliation-worker';
export type {
  ReconciliationConfig,
  ReconciliationResult,
  ReconciliationRun,
  TransactionRecord as ReconciliationTransactionRecord,
  ProviderAdapter,
} from './reconciliation/reconciliation-worker';

// Logging
export { Logger, createLogger, createLoggerMiddleware, createErrorLogger } from './logging/logger';
export type { LogLevel, LogContext, LoggerConfig } from './logging/logger';

// Database
export {
  MigrationRunner,
  createMigrationRunner,
  generateMigration,
} from './database/migration-runner';
export type {
  MigrationConfig,
  Migration,
  MigrationResult,
} from './database/migration-runner';
