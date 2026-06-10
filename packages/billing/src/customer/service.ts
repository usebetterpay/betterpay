// ── Customer service ─────────────────────────────────────────────────────

import type { CustomerRecord } from '../types';

export interface CustomerRepository {
  create(data: {
    email: string;
    name?: string;
    phone?: string;
    metadata?: Record<string, string>;
  }): Promise<CustomerRecord>;

  getById(id: string): Promise<CustomerRecord | undefined>;
  getByEmail(email: string): Promise<CustomerRecord | undefined>;
  update(id: string, data: Partial<CustomerRecord>): Promise<CustomerRecord | undefined>;
  delete(id: string): Promise<void>;
  list(limit: number, offset: number): Promise<CustomerRecord[]>;
}

export class CustomerService {
  constructor(
    private readonly repo: CustomerRepository,
  ) {}

  async create(data: {
    email: string;
    name?: string;
    phone?: string;
    metadata?: Record<string, string>;
  }): Promise<CustomerRecord> {
    return this.repo.create(data);
  }

  async getById(id: string): Promise<CustomerRecord | undefined> {
    return this.repo.getById(id);
  }

  async getByEmail(email: string): Promise<CustomerRecord | undefined> {
    return this.repo.getByEmail(email);
  }

  async getOrCreate(email: string, name?: string): Promise<CustomerRecord> {
    const existing = await this.repo.getByEmail(email);
    if (existing) return existing;
    return this.repo.create({ email, name });
  }

  async update(id: string, data: Partial<CustomerRecord>): Promise<CustomerRecord | undefined> {
    return this.repo.update(id, data);
  }

  async delete(id: string): Promise<void> {
    return this.repo.delete(id);
  }

  async list(limit = 50, offset = 0): Promise<CustomerRecord[]> {
    return this.repo.list(limit, offset);
  }
}
