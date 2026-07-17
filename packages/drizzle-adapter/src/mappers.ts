// ── Map drizzle row shapes ↔ billing domain records ──────────────────────
// DB columns use groupId; billing contracts use group.

import type {
  SubscriptionRecord,
  EntitlementRecord,
  CustomerRecord,
  InvoiceRecord,
} from './types';

type DbSubscriptionRow = {
  id: string;
  customerId: string;
  planId: string;
  groupId?: string;
  group?: string;
  status: SubscriptionRecord['status'];
  cancelAtPeriodEnd: boolean;
  currentPeriodStartAt: Date | null;
  currentPeriodEndAt: Date | null;
  metadata?: Record<string, string> | null;
  createdAt: Date;
  updatedAt: Date;
};

export function toSubscriptionRecord(row: DbSubscriptionRow): SubscriptionRecord {
  return {
    id: row.id,
    customerId: row.customerId,
    planId: row.planId,
    group: row.group ?? row.groupId ?? '',
    status: row.status,
    cancelAtPeriodEnd: row.cancelAtPeriodEnd,
    currentPeriodStartAt: row.currentPeriodStartAt,
    currentPeriodEndAt: row.currentPeriodEndAt,
    metadata: row.metadata ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toEntitlementRecord(row: EntitlementRecord): EntitlementRecord {
  return { ...row };
}

export function toCustomerRecord(row: {
  id: string;
  email: string;
  name?: string | null;
  phone?: string | null;
  metadata?: Record<string, string> | null;
  createdAt: Date;
  updatedAt: Date;
}): CustomerRecord {
  return {
    id: row.id,
    email: row.email,
    name: row.name ?? undefined,
    phone: row.phone ?? undefined,
    metadata: row.metadata ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toInvoiceRecord(row: InvoiceRecord): InvoiceRecord {
  return { ...row };
}
