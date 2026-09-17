// ── Transaction Service ───────────────────────────────────────────────────
// Orchestrates CRUD + state-machine transitions for payment transactions.

import {
  type TransactionRecord,
  type TransactionStatus,
  isValidTransition,
} from './schema';
import { BillingError, ConflictError, NotFoundError } from '../errors/betterpay-error';

/** Minimal repository contract the service depends on. */
export interface TransactionRepository {
  createTransaction(data: {
    orderId: string;
    providerId: string;
    amount: number;
    currency: string;
    customerEmail: string;
    metadata?: Record<string, string>;
  }): Promise<TransactionRecord>;

  getTransactionByOrderId(orderId: string): Promise<TransactionRecord | undefined>;

  updateStatus(
    orderId: string,
    status: TransactionStatus,
    providerTransactionId?: string,
  ): Promise<TransactionRecord | undefined>;

  checkIdempotencyKey(key: string): Promise<string | undefined>;
  setIdempotencyKey(key: string, transactionId: string): Promise<void>;

  /**
   * Optional: list non-terminal transactions for reconciliation.
   * `maxAge` is the oldest createdAt to include (createdAt >= maxAge).
   */
  listPendingForReconciliation?(
    providerIds: string[],
    maxAge: Date,
    limit: number,
  ): Promise<TransactionRecord[]>;
}

export class TransactionService {
  constructor(private readonly repo: TransactionRepository) {}

  /** Create a new transaction (status = pending). */
  async create(data: {
    orderId: string;
    providerId: string;
    amount: number;
    currency: string;
    customerEmail: string;
    metadata?: Record<string, string>;
  }): Promise<TransactionRecord> {
    return this.repo.createTransaction(data);
  }

  /** Get a transaction by orderId. */
  async getByOrderId(orderId: string): Promise<TransactionRecord | undefined> {
    return this.repo.getTransactionByOrderId(orderId);
  }

  /**
   * Update a transaction's status, enforcing the state machine.
   * @throws Error if the transition is invalid.
   */
  async updateStatus(
    orderId: string,
    newStatus: TransactionStatus,
    providerTransactionId?: string,
  ): Promise<TransactionRecord> {
    const current = await this.repo.getTransactionByOrderId(orderId);
    if (!current) {
      throw new NotFoundError(`Transaction not found: ${orderId}`);
    }

    if (!isValidTransition(current.status, newStatus)) {
      throw new ConflictError(
        `Invalid state transition: ${current.status} → ${newStatus}`,
      );
    }

    const updated = await this.repo.updateStatus(orderId, newStatus, providerTransactionId);
    if (!updated) {
      throw new BillingError(`Failed to update transaction: ${orderId}`);
    }

    return updated;
  }

  /**
   * Non-terminal transactions for reconciliation (pending/active).
   * Returns [] if the repository does not implement listing.
   */
  async listPendingForReconciliation(
    providerIds: string[],
    maxAge: Date,
    limit: number,
  ): Promise<TransactionRecord[]> {
    if (!this.repo.listPendingForReconciliation) return [];
    return this.repo.listPendingForReconciliation(providerIds, maxAge, limit);
  }

  /** Idempotency helpers (delegated to repository). */
  async checkIdempotencyKey(key: string): Promise<string | undefined> {
    return this.repo.checkIdempotencyKey(key);
  }

  async setIdempotencyKey(key: string, transactionId: string): Promise<void> {
    return this.repo.setIdempotencyKey(key, transactionId);
  }
}
