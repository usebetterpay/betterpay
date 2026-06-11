// Reconciliation Worker - Poll for Missed Webhooks
// Ensures payment status consistency by periodically checking provider APIs

export interface ReconciliationConfig {
  /** How often to run reconciliation (in minutes) */
  intervalMinutes: number;
  /** Maximum transactions to check per run */
  batchSize: number;
  /** Age threshold for checking transactions (in hours) */
  maxAgeHours: number;
  /** Providers to reconcile */
  providerIds: string[];
}

export const DEFAULT_RECONCILIATION_CONFIG: ReconciliationConfig = {
  intervalMinutes: 60, // Every hour
  batchSize: 100,
  maxAgeHours: 24,
  providerIds: ['midtrans', 'xendit', 'duitku', 'pakasir'],
};

export interface ReconciliationResult {
  transactionId: string;
  providerId: string;
  providerTransactionId: string;
  localStatus: string;
  providerStatus: string;
  action: 'none' | 'update' | 'conflict';
  updatedAt?: Date;
  error?: string;
}

export interface ReconciliationRun {
  startedAt: Date;
  completedAt: Date;
  totalChecked: number;
  updated: number;
  conflicts: number;
  errors: number;
  results: ReconciliationResult[];
}

export interface TransactionRecord {
  id: string;
  orderId: string;
  providerId: string;
  providerTransactionId: string;
  status: string;
  amount: number;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProviderAdapter {
  id: string;
  getTransactionStatus(providerTransactionId: string): Promise<{
    status: string;
    amount?: number;
    currency?: string;
    metadata?: Record<string, any>;
  }>;
}

export class ReconciliationWorker {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  private runs: ReconciliationRun[] = [];

  constructor(
    private config: ReconciliationConfig = DEFAULT_RECONCILIATION_CONFIG,
    private providers: Map<string, ProviderAdapter> = new Map(),
    private getPendingTransactions: (
      providerIds: string[],
      maxAge: Date,
      limit: number,
    ) => Promise<TransactionRecord[]>,
    private updateTransactionStatus: (
      transactionId: string,
      status: string,
      metadata?: Record<string, any>,
    ) => Promise<void>,
  ) {}

  /**
   * Register a provider adapter.
   */
  registerProvider(adapter: ProviderAdapter): void {
    this.providers.set(adapter.id, adapter);
  }

  /**
   * Start automatic reconciliation.
   */
  start(): void {
    if (this.intervalId) return;

    this.intervalId = setInterval(
      () => this.run(),
      this.config.intervalMinutes * 60 * 1000,
    );

    // Run immediately on start
    this.run();
  }

  /**
   * Stop automatic reconciliation.
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Run reconciliation once.
   */
  async run(): Promise<ReconciliationRun> {
    if (this.isRunning) {
      throw new Error('Reconciliation already in progress');
    }

    this.isRunning = true;
    const startedAt = new Date();
    const results: ReconciliationResult[] = [];

    try {
      const maxAge = new Date();
      maxAge.setHours(maxAge.getHours() - this.config.maxAgeHours);

      const transactions = await this.getPendingTransactions(
        this.config.providerIds,
        maxAge,
        this.config.batchSize,
      );

      for (const transaction of transactions) {
        const result = await this.reconcileTransaction(transaction);
        results.push(result);
      }

      const run: ReconciliationRun = {
        startedAt,
        completedAt: new Date(),
        totalChecked: results.length,
        updated: results.filter(r => r.action === 'update').length,
        conflicts: results.filter(r => r.action === 'conflict').length,
        errors: results.filter(r => r.error).length,
        results,
      };

      this.runs.push(run);
      return run;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Reconcile a single transaction.
   */
  private async reconcileTransaction(
    transaction: TransactionRecord,
  ): Promise<ReconciliationResult> {
    const provider = this.providers.get(transaction.providerId);

    if (!provider) {
      return {
        transactionId: transaction.id,
        providerId: transaction.providerId,
        providerTransactionId: transaction.providerTransactionId,
        localStatus: transaction.status,
        providerStatus: 'unknown',
        action: 'none',
        error: `Provider ${transaction.providerId} not registered`,
      };
    }

    try {
      const providerData = await provider.getTransactionStatus(
        transaction.providerTransactionId,
      );

      const localStatus = this.normalizeStatus(transaction.status);
      const providerStatus = this.normalizeStatus(providerData.status);

      // No change needed
      if (localStatus === providerStatus) {
        return {
          transactionId: transaction.id,
          providerId: transaction.providerId,
          providerTransactionId: transaction.providerTransactionId,
          localStatus,
          providerStatus,
          action: 'none',
        };
      }

      // Check if update is valid (provider is source of truth)
      if (this.isValidStatusTransition(localStatus, providerStatus)) {
        await this.updateTransactionStatus(
          transaction.id,
          providerStatus,
          providerData.metadata,
        );

        return {
          transactionId: transaction.id,
          providerId: transaction.providerId,
          providerTransactionId: transaction.providerTransactionId,
          localStatus,
          providerStatus,
          action: 'update',
          updatedAt: new Date(),
        };
      }

      // Invalid transition - conflict
      return {
        transactionId: transaction.id,
        providerId: transaction.providerId,
        providerTransactionId: transaction.providerTransactionId,
        localStatus,
        providerStatus,
        action: 'conflict',
        error: `Invalid status transition: ${localStatus} -> ${providerStatus}`,
      };
    } catch (error) {
      return {
        transactionId: transaction.id,
        providerId: transaction.providerId,
        providerTransactionId: transaction.providerTransactionId,
        localStatus: transaction.status,
        providerStatus: 'error',
        action: 'none',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Normalize status strings for comparison.
   */
  private normalizeStatus(status: string): string {
    const statusMap: Record<string, string> = {
      pending: 'pending',
      processing: 'pending',
      success: 'success',
      completed: 'success',
      paid: 'success',
      failed: 'failed',
      expired: 'expired',
      cancelled: 'cancelled',
      canceled: 'cancelled',
      refunded: 'refunded',
    };

    return statusMap[status.toLowerCase()] || status.toLowerCase();
  }

  /**
   * Check if status transition is valid.
   */
  private isValidStatusTransition(from: string, to: string): boolean {
    const validTransitions: Record<string, string[]> = {
      pending: ['success', 'failed', 'expired', 'cancelled'],
      processing: ['success', 'failed', 'expired', 'cancelled'],
      success: ['refunded'],
      failed: [],
      expired: [],
      cancelled: [],
      refunded: [],
    };

    return validTransitions[from]?.includes(to) || false;
  }

  /**
   * Get reconciliation run history.
   */
  getRuns(limit: number = 10): ReconciliationRun[] {
    return this.runs.slice(-limit).reverse();
  }

  /**
   * Get last reconciliation run.
   */
  getLastRun(): ReconciliationRun | null {
    return this.runs[this.runs.length - 1] || null;
  }

  /**
   * Check if reconciliation is currently running.
   */
  getIsRunning(): boolean {
    return this.isRunning;
  }
}

/**
 * Create reconciliation worker.
 */
export function createReconciliationWorker(
  config?: Partial<ReconciliationConfig>,
  providers?: Map<string, ProviderAdapter>,
  getPendingTransactions?: (
    providerIds: string[],
    maxAge: Date,
    limit: number,
  ) => Promise<TransactionRecord[]>,
  updateTransactionStatus?: (
    transactionId: string,
    status: string,
    metadata?: Record<string, any>,
  ) => Promise<void>,
): ReconciliationWorker {
  const defaultGetPending = async () => [];
  const defaultUpdateStatus = async () => {};

  return new ReconciliationWorker(
    { ...DEFAULT_RECONCILIATION_CONFIG, ...config },
    providers || new Map(),
    getPendingTransactions || defaultGetPending,
    updateTransactionStatus || defaultUpdateStatus,
  );
}
