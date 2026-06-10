// ── ID generation helpers ─────────────────────────────────────────────────

import { randomBytes } from 'node:crypto';

/**
 * Generate a unique order ID: "bp_" + 12 random base62 chars ≈ 15 chars total.
 * Well under the 50-char limit enforced by all Indonesian payment providers.
 */
export function generateOrderId(): string {
  return `bp_${randomBase62(12)}`;
}

/**
 * Generate a random base62 string of the given length.
 * Uses crypto.randomBytes for cryptographic randomness.
 */
function randomBase62(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = randomBytes(length);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i]! % chars.length];
  }
  return result;
}

/**
 * Validate an order ID against provider constraints.
 * Max 50 chars, alphanumeric + dash, underscore, tilde, dot.
 */
export function validateOrderId(orderId: string): void {
  if (!orderId) {
    throw new Error('Order ID is required');
  }
  if (orderId.length > 50) {
    throw new Error(`Order ID must be 1-50 characters, got ${orderId.length}`);
  }
  if (!/^[a-zA-Z0-9\-_.~]+$/.test(orderId)) {
    throw new Error(
      'Order ID can only contain alphanumeric characters, dash (-), underscore (_), tilde (~), and dot (.)',
    );
  }
}

/**
 * Validate amount for ISO 4217 currency.
 * IDR has 0 decimals → amount must be a positive integer.
 */
export function validateAmount(amount: number, currency: string): void {
  if (typeof amount !== 'number' || !Number.isFinite(amount)) {
    throw new Error('Amount must be a finite number');
  }
  if (amount <= 0) {
    throw new Error('Amount must be greater than zero');
  }
  const zeroDecimalCurrencies = ['IDR', 'VND', 'JPY'];
  if (zeroDecimalCurrencies.includes(currency.toUpperCase()) && !Number.isInteger(amount)) {
    throw new Error(`${currency} does not support decimal amounts`);
  }
}
