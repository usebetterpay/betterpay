// ── CredentialStore — Secure credential management ────────────────────────
// Two-tier: env vars (simple) or DB (encrypted, for dashboard/multi-provider)
//
// Usage:
//   // Env-based (current, simple):
//   const pay = betterPay({
//     plugins: [midtrans({ serverKey: process.env.MIDTRANS_SERVER_KEY! })],
//   });
//
//   // DB-backed (new, dashboard-ready):
//   const pay = betterPay({
//     database: process.env.DATABASE_URL!,
//     masterKey: process.env.BETTERPAY_MASTER_KEY!,
//   });
//   await pay.credentialStore.set('midtrans', { serverKey: 'SB-Mid-xxx' });
//   const creds = await pay.credentialStore.get('midtrans');
//   // → { serverKey: 'SB-Mid-xxx' }

import {
  CredentialEncryption,
  createCredentialEncryption,
  type EncryptedValue,
} from './credential-encryption';
import { generateOrderId } from '../utils/id';

// ── Interface ─────────────────────────────────────────────────────────────

export interface CredentialRecord {
  id: string;
  providerId: string;
  credentials: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CredentialRepository {
  findByProviderId(providerId: string): Promise<CredentialRecord | null>;
  findAll(): Promise<CredentialRecord[]>;
  save(record: CredentialRecord): Promise<void>;
  deleteByProviderId(providerId: string): Promise<void>;
}

export interface CredentialStore {
  /** Store encrypted credentials for a provider. */
  set(providerId: string, credentials: Record<string, string>): Promise<void>;

  /** Get decrypted credentials for a provider. Returns null if not found. */
  get(providerId: string): Promise<Record<string, string> | null>;

  /** List all provider IDs that have stored credentials. */
  list(): Promise<string[]>;

  /** Delete stored credentials for a provider. */
  delete(providerId: string): Promise<void>;

  /** Check if credentials exist for a provider. */
  has(providerId: string): Promise<boolean>;
}

// ── In-Memory Repository (for testing) ────────────────────────────────────

export class InMemoryCredentialRepository implements CredentialRepository {
  private records = new Map<string, CredentialRecord>();

  async findByProviderId(providerId: string): Promise<CredentialRecord | null> {
    return this.records.get(providerId) ?? null;
  }

  async findAll(): Promise<CredentialRecord[]> {
    return Array.from(this.records.values());
  }

  async save(record: CredentialRecord): Promise<void> {
    this.records.set(record.providerId, record);
  }

  async deleteByProviderId(providerId: string): Promise<void> {
    this.records.delete(providerId);
  }
}

// ── CredentialStore implementation ────────────────────────────────────────

export class DefaultCredentialStore implements CredentialStore {
  private repo: CredentialRepository;
  private encryption: CredentialEncryption;

  constructor(repo: CredentialRepository, masterKey: string) {
    this.repo = repo;
    this.encryption = createCredentialEncryption(masterKey);
  }

  async set(providerId: string, credentials: Record<string, string>): Promise<void> {
    const encrypted = this.encryption.encryptAll(credentials);

    const existing = await this.repo.findByProviderId(providerId);
    const now = new Date();

    const record: CredentialRecord = {
      id: existing?.id ?? generateOrderId(),
      providerId,
      credentials: encrypted as unknown as Record<string, string>,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    await this.repo.save(record);
  }

  async get(providerId: string): Promise<Record<string, string> | null> {
    const record = await this.repo.findByProviderId(providerId);
    if (!record) return null;

    const encrypted = record.credentials as unknown as Record<string, EncryptedValue>;
    return this.encryption.decryptAll(encrypted);
  }

  async list(): Promise<string[]> {
    const records = await this.repo.findAll();
    return records.map((r) => r.providerId);
  }

  async delete(providerId: string): Promise<void> {
    await this.repo.deleteByProviderId(providerId);
  }

  async has(providerId: string): Promise<boolean> {
    const record = await this.repo.findByProviderId(providerId);
    return record !== null;
  }
}

// ── Null store (when no masterKey — credentials must come from env) ───────

export class NullCredentialStore implements CredentialStore {
  async set(_providerId: string, _credentials: Record<string, string>): Promise<void> {
    throw new Error(
      'CredentialStore is not configured. Set BETTERPAY_MASTER_KEY to enable credential storage.',
    );
  }

  async get(_providerId: string): Promise<Record<string, string> | null> {
    return null;
  }

  async list(): Promise<string[]> {
    return [];
  }

  async delete(_providerId: string): Promise<void> {
    // no-op
  }

  async has(_providerId: string): Promise<boolean> {
    return false;
  }
}
