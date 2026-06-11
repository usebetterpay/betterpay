import { describe, it, expect } from 'vitest';
import {
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
} from '../src/errors/betterpay-error';

describe('BetterPayError', () => {
  describe('constructor', () => {
    it('should create error with all options', () => {
      const error = new BetterPayError({
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        statusCode: 400,
        details: { field: 'email' },
        retryable: false,
      });

      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.message).toBe('Invalid input');
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual({ field: 'email' });
      expect(error.retryable).toBe(false);
      expect(error.timestamp).toBeInstanceOf(Date);
    });

    it('should use default status code based on error code', () => {
      const error = new BetterPayError({
        code: 'NOT_FOUND',
        message: 'Not found',
      });
      expect(error.statusCode).toBe(404);
    });

    it('should set name property', () => {
      const error = new BetterPayError({
        code: 'INTERNAL_ERROR',
        message: 'Error',
      });
      expect(error.name).toBe('BetterPayError');
    });
  });

  describe('toJSON', () => {
    it('should serialize error to JSON', () => {
      const error = new BetterPayError({
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        details: { field: 'email' },
      });

      const json = error.toJSON();
      expect(json.name).toBe('BetterPayError');
      expect(json.code).toBe('VALIDATION_ERROR');
      expect(json.message).toBe('Invalid input');
      expect(json.statusCode).toBe(400);
      expect(json.details).toEqual({ field: 'email' });
      expect(json.retryable).toBe(false);
      expect(json.timestamp).toBeDefined();
    });
  });

  describe('toResponse', () => {
    it('should create HTTP response', () => {
      const error = new BetterPayError({
        code: 'NOT_FOUND',
        message: 'Not found',
      });

      const response = error.toResponse();
      expect(response.status).toBe(404);
      expect(response.body.code).toBe('NOT_FOUND');
      expect(response.body.message).toBe('Not found');
    });
  });
});

describe('Specific error classes', () => {
  it('ValidationError', () => {
    const error = new ValidationError('Invalid email', { field: 'email' });
    expect(error).toBeInstanceOf(BetterPayError);
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.statusCode).toBe(400);
    expect(error.name).toBe('ValidationError');
  });

  it('NotFoundError', () => {
    const error = new NotFoundError('Customer', 'cust_123');
    expect(error.code).toBe('NOT_FOUND');
    expect(error.message).toBe("Customer with id 'cust_123' not found");
    expect(error.details).toEqual({ resource: 'Customer', id: 'cust_123' });
  });

  it('NotFoundError without id', () => {
    const error = new NotFoundError('Customer');
    expect(error.message).toBe('Customer not found');
  });

  it('UnauthorizedError', () => {
    const error = new UnauthorizedError();
    expect(error.code).toBe('UNAUTHORIZED');
    expect(error.statusCode).toBe(401);
    expect(error.message).toBe('Unauthorized');
  });

  it('ForbiddenError', () => {
    const error = new ForbiddenError();
    expect(error.code).toBe('FORBIDDEN');
    expect(error.statusCode).toBe(403);
  });

  it('ConflictError', () => {
    const error = new ConflictError('Duplicate order ID', { orderId: '123' });
    expect(error.code).toBe('CONFLICT');
    expect(error.statusCode).toBe(409);
  });

  it('RateLimitError', () => {
    const error = new RateLimitError(60000);
    expect(error.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(error.statusCode).toBe(429);
    expect(error.retryable).toBe(true);
    expect(error.details?.retryAfterMs).toBe(60000);
  });

  it('ProviderError', () => {
    const error = new ProviderError('midtrans', 'API timeout', {
      retryable: true,
      details: { endpoint: '/api/charge' },
    });
    expect(error.code).toBe('PROVIDER_ERROR');
    expect(error.statusCode).toBe(502);
    expect(error.message).toContain('midtrans');
    expect(error.retryable).toBe(true);
  });

  it('WebhookError', () => {
    const error = new WebhookError('Invalid signature');
    expect(error.code).toBe('WEBHOOK_ERROR');
    expect(error.statusCode).toBe(400);
  });

  it('BillingError', () => {
    const error = new BillingError('Insufficient balance');
    expect(error.code).toBe('BILLING_ERROR');
  });

  it('DunningError', () => {
    const error = new DunningError('Payment failed');
    expect(error.code).toBe('DUNNING_ERROR');
  });

  it('ReconciliationError', () => {
    const error = new ReconciliationError('Sync failed', { count: 5 }, new Error('Original'));
    expect(error.code).toBe('RECONCILIATION_ERROR');
    expect(error.retryable).toBe(true);
    expect(error.cause).toBeInstanceOf(Error);
  });

  it('EncryptionError', () => {
    const error = new EncryptionError('Decryption failed');
    expect(error.code).toBe('ENCRYPTION_ERROR');
    expect(error.statusCode).toBe(500);
  });

  it('MigrationError', () => {
    const error = new MigrationError('Migration failed', { version: 2 });
    expect(error.code).toBe('MIGRATION_ERROR');
    expect(error.statusCode).toBe(500);
  });
});

describe('toBetterPayError', () => {
  it('should return BetterPayError as-is', () => {
    const original = new ValidationError('Test');
    const result = toBetterPayError(original);
    expect(result).toBe(original);
  });

  it('should wrap Error', () => {
    const original = new Error('Test error');
    const result = toBetterPayError(original);
    expect(result).toBeInstanceOf(BetterPayError);
    expect(result.code).toBe('INTERNAL_ERROR');
    expect(result.message).toBe('Test error');
    expect(result.cause).toBe(original);
  });

  it('should wrap string', () => {
    const result = toBetterPayError('Test error');
    expect(result).toBeInstanceOf(BetterPayError);
    expect(result.code).toBe('INTERNAL_ERROR');
    expect(result.message).toBe('Test error');
  });

  it('should wrap unknown', () => {
    const result = toBetterPayError({ foo: 'bar' });
    expect(result).toBeInstanceOf(BetterPayError);
    expect(result.code).toBe('INTERNAL_ERROR');
  });
});

describe('isRetryableError', () => {
  it('should return true for retryable errors', () => {
    const error = new RateLimitError(60000);
    expect(isRetryableError(error)).toBe(true);
  });

  it('should return false for non-retryable errors', () => {
    const error = new ValidationError('Invalid');
    expect(isRetryableError(error)).toBe(false);
  });

  it('should return false for unknown errors', () => {
    expect(isRetryableError(new Error('Test'))).toBe(false);
    expect(isRetryableError('Test')).toBe(false);
  });
});
