import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TransactionService } from '../src/transaction/service';
import type { TransactionRecord, TransactionStatus } from '../src/transaction/schema';

// In-memory mock repository
function createMockRepository() {
  const transactions = new Map<string, TransactionRecord>();
  const events: Array<{ transactionId: string; type: string; seq: number }> = [];
  const idempotencyKeys = new Map<string, string>();

  return {
    transactions,
    events,
    idempotencyKeys,

    async createTransaction(data: {
      orderId: string;
      providerId: string;
      amount: number;
      currency: string;
      customerEmail: string;
      metadata?: Record<string, string>;
    }): Promise<TransactionRecord> {
      const record: TransactionRecord = {
        id: `txn_${Math.random().toString(36).slice(2, 10)}`,
        orderId: data.orderId,
        providerId: data.providerId,
        status: 'pending',
        amount: data.amount,
        currency: data.currency,
        customerEmail: data.customerEmail,
        metadata: data.metadata ?? null,
        providerTransactionId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      transactions.set(data.orderId, record);
      events.push({ transactionId: record.id, type: 'created', seq: 1 });
      return record;
    },

    async getTransactionByOrderId(orderId: string): Promise<TransactionRecord | undefined> {
      return transactions.get(orderId);
    },

    async updateStatus(
      orderId: string,
      status: TransactionStatus,
      providerTransactionId?: string,
    ): Promise<TransactionRecord | undefined> {
      const record = transactions.get(orderId);
      if (!record) return undefined;
      record.status = status;
      record.updatedAt = new Date();
      if (providerTransactionId) {
        record.providerTransactionId = providerTransactionId;
      }
      events.push({
        transactionId: record.id,
        type: `status_${status}`,
        seq: events.filter((e) => e.transactionId === record.id).length + 1,
      });
      return record;
    },

    async checkIdempotencyKey(key: string): Promise<string | undefined> {
      return idempotencyKeys.get(key);
    },

    async setIdempotencyKey(key: string, transactionId: string): Promise<void> {
      idempotencyKeys.set(key, transactionId);
    },
  };
}

describe('TransactionService', () => {
  let repo: ReturnType<typeof createMockRepository>;
  let service: TransactionService;

  beforeEach(() => {
    repo = createMockRepository();
    service = new TransactionService(repo as any);
  });

  it('should create a transaction', async () => {
    const result = await service.create({
      orderId: 'order_001',
      providerId: 'midtrans',
      amount: 100000,
      currency: 'IDR',
      customerEmail: 'test@example.com',
    });

    expect(result.orderId).toBe('order_001');
    expect(result.status).toBe('pending');
    expect(result.amount).toBe(100000);
    expect(result.currency).toBe('IDR');
  });

  it('should get transaction by orderId', async () => {
    await service.create({
      orderId: 'order_002',
      providerId: 'xendit',
      amount: 200000,
      currency: 'IDR',
      customerEmail: 'test@example.com',
    });

    const result = await service.getByOrderId('order_002');
    expect(result).toBeDefined();
    expect(result!.orderId).toBe('order_002');
  });

  it('should update transaction status', async () => {
    await service.create({
      orderId: 'order_003',
      providerId: 'midtrans',
      amount: 50000,
      currency: 'IDR',
      customerEmail: 'test@example.com',
    });

    const updated = await service.updateStatus('order_003', 'active', 'prov_txn_123');
    expect(updated).toBeDefined();
    expect(updated!.status).toBe('active');
    expect(updated!.providerTransactionId).toBe('prov_txn_123');
  });

  it('should reject invalid status transitions', async () => {
    await service.create({
      orderId: 'order_004',
      providerId: 'midtrans',
      amount: 50000,
      currency: 'IDR',
      customerEmail: 'test@example.com',
    });

    // Move to completed
    await service.updateStatus('order_004', 'completed');

    // Cannot move from completed to active
    await expect(service.updateStatus('order_004', 'active')).rejects.toThrow(
      'Invalid state transition',
    );
  });

  it('should return undefined when getting non-existent transaction', async () => {
    const result = await service.getByOrderId('nonexistent');
    expect(result).toBeUndefined();
  });
});
