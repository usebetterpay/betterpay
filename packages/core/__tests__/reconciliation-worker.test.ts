import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ReconciliationWorker,
  createReconciliationWorker,
  TransactionRecord,
  ProviderAdapter,
} from '../src/reconciliation/reconciliation-worker';

describe('ReconciliationWorker', () => {
  let worker: ReconciliationWorker;
  let mockProvider: ProviderAdapter;
  let mockGetPending: ReturnType<typeof vi.fn>;
  let mockUpdateStatus: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockProvider = {
      id: 'test-provider',
      getTransactionStatus: vi.fn(),
    };

    mockGetPending = vi.fn().mockResolvedValue([]);
    mockUpdateStatus = vi.fn().mockResolvedValue(undefined);

    worker = createReconciliationWorker(
      { intervalMinutes: 60, batchSize: 10, maxAgeHours: 24, providerIds: ['test-provider'] },
      new Map([['test-provider', mockProvider]]),
      mockGetPending,
      mockUpdateStatus,
    );
  });

  describe('run', () => {
    it('should return empty run when no pending transactions', async () => {
      const run = await worker.run();

      expect(run.totalChecked).toBe(0);
      expect(run.updated).toBe(0);
      expect(run.conflicts).toBe(0);
      expect(run.errors).toBe(0);
      expect(run.results).toEqual([]);
    });

    it('should reconcile transactions', async () => {
      const transactions: TransactionRecord[] = [
        {
          id: 'txn1',
          orderId: 'order1',
          providerId: 'test-provider',
          providerTransactionId: 'prov1',
          status: 'pending',
          amount: 100000,
          currency: 'IDR',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockGetPending.mockResolvedValue(transactions);
      (mockProvider.getTransactionStatus as ReturnType<typeof vi.fn>).mockResolvedValue({
        status: 'success',
      });

      const run = await worker.run();

      expect(run.totalChecked).toBe(1);
      expect(run.updated).toBe(1);
      expect(run.conflicts).toBe(0);
      expect(run.errors).toBe(0);
      expect(run.results[0].action).toBe('update');
      expect(mockUpdateStatus).toHaveBeenCalledWith('txn1', 'success', undefined);
    });

    it('should handle status matches', async () => {
      const transactions: TransactionRecord[] = [
        {
          id: 'txn1',
          orderId: 'order1',
          providerId: 'test-provider',
          providerTransactionId: 'prov1',
          status: 'success',
          amount: 100000,
          currency: 'IDR',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockGetPending.mockResolvedValue(transactions);
      (mockProvider.getTransactionStatus as ReturnType<typeof vi.fn>).mockResolvedValue({
        status: 'success',
      });

      const run = await worker.run();

      expect(run.totalChecked).toBe(1);
      expect(run.updated).toBe(0);
      expect(run.results[0].action).toBe('none');
    });

    it('should detect conflicts', async () => {
      const transactions: TransactionRecord[] = [
        {
          id: 'txn1',
          orderId: 'order1',
          providerId: 'test-provider',
          providerTransactionId: 'prov1',
          status: 'success',
          amount: 100000,
          currency: 'IDR',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockGetPending.mockResolvedValue(transactions);
      (mockProvider.getTransactionStatus as ReturnType<typeof vi.fn>).mockResolvedValue({
        status: 'pending',
      });

      const run = await worker.run();

      expect(run.totalChecked).toBe(1);
      expect(run.conflicts).toBe(1);
      expect(run.results[0].action).toBe('conflict');
    });

    it('should handle provider errors', async () => {
      const transactions: TransactionRecord[] = [
        {
          id: 'txn1',
          orderId: 'order1',
          providerId: 'test-provider',
          providerTransactionId: 'prov1',
          status: 'pending',
          amount: 100000,
          currency: 'IDR',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockGetPending.mockResolvedValue(transactions);
      (mockProvider.getTransactionStatus as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('API error'),
      );

      const run = await worker.run();

      expect(run.totalChecked).toBe(1);
      expect(run.errors).toBe(1);
      expect(run.results[0].error).toBe('API error');
    });

    it('should prevent concurrent runs', async () => {
      const promise1 = worker.run();
      await expect(worker.run()).rejects.toThrow('already in progress');
      await promise1;
    });
  });

  describe('start/stop', () => {
    it('should start and stop automatic reconciliation', () => {
      const setIntervalSpy = vi.spyOn(global, 'setInterval');
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

      worker.start();
      expect(setIntervalSpy).toHaveBeenCalled();

      worker.stop();
      expect(clearIntervalSpy).toHaveBeenCalled();

      setIntervalSpy.mockRestore();
      clearIntervalSpy.mockRestore();
    });

    it('should not start twice', () => {
      const setIntervalSpy = vi.spyOn(global, 'setInterval');

      worker.start();
      worker.start();

      expect(setIntervalSpy).toHaveBeenCalledTimes(1);

      worker.stop();
      setIntervalSpy.mockRestore();
    });
  });

  describe('getRuns', () => {
    it('should return run history', async () => {
      await worker.run();
      await worker.run();

      const runs = worker.getRuns();
      expect(runs).toHaveLength(2);
    });

    it('should limit run history', async () => {
      await worker.run();
      await worker.run();
      await worker.run();

      const runs = worker.getRuns(2);
      expect(runs).toHaveLength(2);
    });
  });

  describe('getLastRun', () => {
    it('should return last run', async () => {
      await worker.run();
      await worker.run();

      const lastRun = worker.getLastRun();
      expect(lastRun).toBeDefined();
    });

    it('should return null when no runs', () => {
      const lastRun = worker.getLastRun();
      expect(lastRun).toBeNull();
    });
  });
});
