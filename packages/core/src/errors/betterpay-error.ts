// BetterPay Error Taxonomy
// Structured error classes for consistent error handling

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'CONFLICT'
  | 'RATE_LIMIT_EXCEEDED'
  | 'PROVIDER_ERROR'
  | 'WEBHOOK_ERROR'
  | 'BILLING_ERROR'
  | 'DUNNING_ERROR'
  | 'RECONCILIATION_ERROR'
  | 'ENCRYPTION_ERROR'
  | 'MIGRATION_ERROR'
  | 'INTERNAL_ERROR';

export interface BetterPayErrorOptions {
  code: ErrorCode;
  message: string;
  statusCode?: number;
  details?: Record<string, any>;
  cause?: Error;
  retryable?: boolean;
}

export class BetterPayError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: Record<string, any>;
  public readonly cause?: Error;
  public readonly retryable: boolean;
  public readonly timestamp: Date;

  constructor(options: BetterPayErrorOptions) {
    super(options.message);
    this.name = 'BetterPayError';
    this.code = options.code;
    this.statusCode = options.statusCode || this.getDefaultStatusCode(options.code);
    this.details = options.details;
    this.cause = options.cause;
    this.retryable = options.retryable ?? false;
    this.timestamp = new Date();

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, BetterPayError);
    }
  }

  private getDefaultStatusCode(code: ErrorCode): number {
    const codeToStatus: Record<ErrorCode, number> = {
      VALIDATION_ERROR: 400,
      NOT_FOUND: 404,
      UNAUTHORIZED: 401,
      FORBIDDEN: 403,
      CONFLICT: 409,
      RATE_LIMIT_EXCEEDED: 429,
      PROVIDER_ERROR: 502,
      WEBHOOK_ERROR: 400,
      BILLING_ERROR: 400,
      DUNNING_ERROR: 400,
      RECONCILIATION_ERROR: 500,
      ENCRYPTION_ERROR: 500,
      MIGRATION_ERROR: 500,
      INTERNAL_ERROR: 500,
    };
    return codeToStatus[code];
  }

  toJSON(): Record<string, any> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
      retryable: this.retryable,
      timestamp: this.timestamp.toISOString(),
    };
  }

  /**
   * Create error response for HTTP.
   */
  toResponse(): { status: number; body: Record<string, any> } {
    return {
      status: this.statusCode,
      body: this.toJSON(),
    };
  }
}

// Specific error classes
export class ValidationError extends BetterPayError {
  constructor(message: string, details?: Record<string, any>) {
    super({
      code: 'VALIDATION_ERROR',
      message,
      details,
    });
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends BetterPayError {
  constructor(resource: string, id?: string) {
    super({
      code: 'NOT_FOUND',
      message: id ? `${resource} with id '${id}' not found` : `${resource} not found`,
      details: { resource, id },
    });
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends BetterPayError {
  constructor(message: string = 'Unauthorized') {
    super({
      code: 'UNAUTHORIZED',
      message,
    });
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends BetterPayError {
  constructor(message: string = 'Forbidden') {
    super({
      code: 'FORBIDDEN',
      message,
    });
    this.name = 'ForbiddenError';
  }
}

export class ConflictError extends BetterPayError {
  constructor(message: string, details?: Record<string, any>) {
    super({
      code: 'CONFLICT',
      message,
      details,
    });
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends BetterPayError {
  constructor(retryAfterMs: number) {
    super({
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Rate limit exceeded',
      details: { retryAfterMs },
      retryable: true,
    });
    this.name = 'RateLimitError';
  }
}

export class ProviderError extends BetterPayError {
  constructor(
    providerId: string,
    message: string,
    options?: { cause?: Error; retryable?: boolean; details?: Record<string, any> },
  ) {
    super({
      code: 'PROVIDER_ERROR',
      message: `${providerId}: ${message}`,
      details: { providerId, ...options?.details },
      cause: options?.cause,
      retryable: options?.retryable ?? true,
    });
    this.name = 'ProviderError';
  }
}

export class WebhookError extends BetterPayError {
  constructor(message: string, details?: Record<string, any>) {
    super({
      code: 'WEBHOOK_ERROR',
      message,
      details,
    });
    this.name = 'WebhookError';
  }
}

export class BillingError extends BetterPayError {
  constructor(message: string, details?: Record<string, any>) {
    super({
      code: 'BILLING_ERROR',
      message,
      details,
    });
    this.name = 'BillingError';
  }
}

export class DunningError extends BetterPayError {
  constructor(message: string, details?: Record<string, any>) {
    super({
      code: 'DUNNING_ERROR',
      message,
      details,
    });
    this.name = 'DunningError';
  }
}

export class ReconciliationError extends BetterPayError {
  constructor(message: string, details?: Record<string, any>, cause?: Error) {
    super({
      code: 'RECONCILIATION_ERROR',
      message,
      details,
      cause,
      retryable: true,
    });
    this.name = 'ReconciliationError';
  }
}

export class EncryptionError extends BetterPayError {
  constructor(message: string, cause?: Error) {
    super({
      code: 'ENCRYPTION_ERROR',
      message,
      cause,
    });
    this.name = 'EncryptionError';
  }
}

export class MigrationError extends BetterPayError {
  constructor(message: string, details?: Record<string, any>, cause?: Error) {
    super({
      code: 'MIGRATION_ERROR',
      message,
      details,
      cause,
    });
    this.name = 'MigrationError';
  }
}

/**
 * Convert unknown error to BetterPayError.
 */
export function toBetterPayError(error: unknown): BetterPayError {
  if (error instanceof BetterPayError) {
    return error;
  }

  if (error instanceof Error) {
    return new BetterPayError({
      code: 'INTERNAL_ERROR',
      message: error.message,
      cause: error,
    });
  }

  return new BetterPayError({
    code: 'INTERNAL_ERROR',
    message: String(error),
  });
}

/**
 * Check if error is retryable.
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof BetterPayError) {
    return error.retryable;
  }
  return false;
}
