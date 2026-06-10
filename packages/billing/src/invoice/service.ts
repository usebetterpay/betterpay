// ── Invoice service ──────────────────────────────────────────────────────

import type { InvoiceRecord, InvoiceStatus } from '../types';

export interface InvoiceRepository {
  create(data: {
    customerId: string;
    subscriptionId: string;
    planId: string;
    amount: number;
    currency: string;
    dueAt: Date;
  }): Promise<InvoiceRecord>;

  getById(id: string): Promise<InvoiceRecord | undefined>;
  getBySubscription(subscriptionId: string): Promise<InvoiceRecord[]>;
  updateStatus(id: string, status: InvoiceStatus, paidAt?: Date): Promise<InvoiceRecord | undefined>;
  getOverdue(now: Date): Promise<InvoiceRecord[]>;
}

export class InvoiceService {
  constructor(private readonly repo: InvoiceRepository) {}

  async create(data: {
    customerId: string;
    subscriptionId: string;
    planId: string;
    amount: number;
    currency: string;
    dueAt: Date;
  }): Promise<InvoiceRecord> {
    return this.repo.create(data);
  }

  async getById(id: string): Promise<InvoiceRecord | undefined> {
    return this.repo.getById(id);
  }

  async getBySubscription(subscriptionId: string): Promise<InvoiceRecord[]> {
    return this.repo.getBySubscription(subscriptionId);
  }

  async markPaid(id: string, paidAt?: Date): Promise<InvoiceRecord> {
    const invoice = await this.repo.updateStatus(id, 'paid', paidAt ?? new Date());
    if (!invoice) throw new Error(`Invoice not found: ${id}`);
    return invoice;
  }

  async markOverdue(id: string): Promise<InvoiceRecord> {
    const invoice = await this.repo.updateStatus(id, 'overdue');
    if (!invoice) throw new Error(`Invoice not found: ${id}`);
    return invoice;
  }

  async void(id: string): Promise<InvoiceRecord> {
    const invoice = await this.repo.updateStatus(id, 'void');
    if (!invoice) throw new Error(`Invoice not found: ${id}`);
    return invoice;
  }

  async getOverdueInvoices(now?: Date): Promise<InvoiceRecord[]> {
    return this.repo.getOverdue(now ?? new Date());
  }
}
