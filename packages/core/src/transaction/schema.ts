// ── Transaction schema types & state machine ──────────────────────────────

export type TransactionStatus =
  | 'pending'
  | 'active'
  | 'completed'
  | 'expired'
  | 'canceled'
  | 'failed';

export interface TransactionRecord {
  id: string;
  orderId: string;
  providerId: string;
  status: TransactionStatus;
  amount: number;
  currency: string;
  customerEmail: string;
  metadata: Record<string, string> | null;
  providerTransactionId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Valid state transitions.
 * Key = current status, value = set of allowed next statuses.
 */
export const VALID_TRANSITIONS: Record<TransactionStatus, TransactionStatus[]> = {
  pending: ['active', 'completed', 'expired', 'canceled', 'failed'],
  active: ['completed', 'expired', 'canceled', 'failed'],
  completed: [],
  expired: [],
  canceled: [],
  failed: [],
};

/**
 * Check if a transition is valid.
 */
export function isValidTransition(from: TransactionStatus, to: TransactionStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}
