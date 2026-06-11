// Input Validation for API Endpoints
// Prevents injection attacks and ensures data integrity

import { z } from 'zod';

// Common validation schemas
export const schemas = {
  // Order ID validation (alphanumeric + dash, max 50 chars)
  orderId: z.string()
    .min(1, 'Order ID is required')
    .max(50, 'Order ID must be 50 characters or less')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Order ID can only contain letters, numbers, dash, and underscore'),

  // Amount validation (positive integer for IDR)
  amount: z.number()
    .int('Amount must be an integer')
    .positive('Amount must be positive')
    .max(999999999999, 'Amount exceeds maximum'),

  // Email validation
  email: z.string()
    .email('Invalid email address')
    .max(255, 'Email must be 255 characters or less'),

  // Currency validation (ISO 4217)
  currency: z.string()
    .length(3, 'Currency must be 3 characters')
    .regex(/^[A-Z]{3}$/, 'Currency must be uppercase ISO 4217 code')
    .default('IDR'),

  // Provider ID validation
  providerId: z.string()
    .min(1, 'Provider ID is required')
    .max(50, 'Provider ID must be 50 characters or less')
    .regex(/^[a-z0-9_-]+$/, 'Provider ID can only contain lowercase letters, numbers, dash, and underscore'),

  // Webhook payload validation
  webhookPayload: z.object({
    providerId: z.string().min(1),
    payload: z.string().min(1),
    signature: z.string().min(1),
    timestamp: z.number().optional(),
  }),

  // Create transaction request
  createTransaction: z.object({
    orderId: z.string()
      .min(1, 'Order ID is required')
      .max(50, 'Order ID must be 50 characters or less')
      .regex(/^[a-zA-Z0-9_-]+$/, 'Order ID can only contain letters, numbers, dash, and underscore'),
    amount: z.number()
      .int('Amount must be an integer')
      .positive('Amount must be positive')
      .max(999999999999, 'Amount exceeds maximum'),
    currency: z.string()
      .length(3, 'Currency must be 3 characters')
      .regex(/^[A-Z]{3}$/, 'Currency must be uppercase ISO 4217 code')
      .default('IDR'),
    customerEmail: z.string()
      .email('Invalid email address')
      .max(255, 'Email must be 255 characters or less'),
    customerName: z.string()
      .max(255, 'Name must be 255 characters or less')
      .optional(),
    description: z.string()
      .max(1000, 'Description must be 1000 characters or less')
      .optional(),
    metadata: z.record(z.string())
      .optional(),
    providerId: z.string()
      .min(1)
      .max(50)
      .regex(/^[a-z0-9_-]+$/)
      .optional(),
    paymentMethod: z.string()
      .max(50)
      .optional(),
    callbackUrl: z.string()
      .url('Invalid callback URL')
      .optional(),
    returnUrl: z.string()
      .url('Invalid return URL')
      .optional(),
    cancelUrl: z.string()
      .url('Invalid cancel URL')
      .optional(),
  }),

  // Subscribe request
  subscribe: z.object({
    customerId: z.string()
      .min(1, 'Customer ID is required')
      .max(100, 'Customer ID must be 100 characters or less'),
    planId: z.string()
      .min(1, 'Plan ID is required')
      .max(100, 'Plan ID must be 100 characters or less'),
    providerId: z.string()
      .min(1)
      .max(50)
      .regex(/^[a-z0-9_-]+$/)
      .optional(),
    metadata: z.record(z.string())
      .optional(),
  }),

  // Entitlement check request
  entitlementCheck: z.object({
    customerId: z.string()
      .min(1, 'Customer ID is required')
      .max(100, 'Customer ID must be 100 characters or less'),
    featureId: z.string()
      .min(1, 'Feature ID is required')
      .max(100, 'Feature ID must be 100 characters or less'),
  }),

  // Entitlement report request
  entitlementReport: z.object({
    customerId: z.string()
      .min(1, 'Customer ID is required')
      .max(100, 'Customer ID must be 100 characters or less'),
    featureId: z.string()
      .min(1, 'Feature ID is required')
      .max(100, 'Feature ID must be 100 characters or less'),
    amount: z.number()
      .int('Amount must be an integer')
      .positive('Amount must be positive'),
  }),

  // Customer creation request
  createCustomer: z.object({
    email: z.string()
      .email('Invalid email address')
      .max(255, 'Email must be 255 characters or less'),
    name: z.string()
      .max(255, 'Name must be 255 characters or less')
      .optional(),
    phone: z.string()
      .max(50, 'Phone must be 50 characters or less')
      .optional(),
    metadata: z.record(z.string())
      .optional(),
  }),
};

/**
 * Validate input data against a schema.
 */
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: boolean;
  data?: T;
  errors?: z.ZodError['errors'];
} {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return {
    success: false,
    errors: result.error.errors,
  };
}

/**
 * Validate and throw error if invalid.
 */
export function validateInputStrict<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = validateInput(schema, data);

  if (!result.success) {
    const errorMessages = result.errors!.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
    throw new Error(`Validation failed: ${errorMessages}`);
  }

  return result.data!;
}

/**
 * Create validation middleware for Express/Koa.
 */
export function validationMiddleware(schema: z.ZodSchema, source: 'body' | 'query' | 'params' = 'body') {
  return (req: any, res: any, next: any) => {
    const data = req[source];
    const result = validateInput(schema, data);

    if (!result.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: result.errors,
      });
      return;
    }

    // Replace with validated data
    req[source] = result.data;
    next();
  };
}
