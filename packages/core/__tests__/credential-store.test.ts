import { describe, it, expect, beforeEach } from 'vitest';
import {
  DefaultCredentialStore,
  InMemoryCredentialRepository,
  NullCredentialStore,
} from '../src/security/credential-store';

const MASTER_KEY = 'a-very-secure-master-key-for-testing-32chars!!';

describe('DefaultCredentialStore', () => {
  let repo: InMemoryCredentialRepository;
  let store: DefaultCredentialStore;

  beforeEach(() => {
    repo = new InMemoryCredentialRepository();
    store = new DefaultCredentialStore(repo, MASTER_KEY);
  });

  describe('set / get', () => {
    it('should store and retrieve encrypted credentials', async () => {
      await store.set('midtrans', { serverKey: 'SB-Mid-server-abc123' });

      const result = await store.get('midtrans');
      expect(result).toEqual({ serverKey: 'SB-Mid-server-abc123' });
    });

    it('should store multiple credential fields', async () => {
      await store.set('xendit', {
        apiKey: 'xnd_dev_xxxx',
        webhookSecret: 'whsec_yyyy',
      });

      const result = await store.get('xendit');
      expect(result).toEqual({
        apiKey: 'xnd_dev_xxxx',
        webhookSecret: 'whsec_yyyy',
      });
    });

    it('should return null for non-existent provider', async () => {
      const result = await store.get('nonexistent');
      expect(result).toBeNull();
    });

    it('should update existing credentials', async () => {
      await store.set('midtrans', { serverKey: 'old-key' });
      await store.set('midtrans', { serverKey: 'new-key' });

      const result = await store.get('midtrans');
      expect(result).toEqual({ serverKey: 'new-key' });
    });

    it('should encrypt credentials in the repository', async () => {
      await store.set('midtrans', { serverKey: 'SB-Mid-secret' });

      const record = await repo.findByProviderId('midtrans');
      expect(record).not.toBeNull();
      // Stored value should NOT be plaintext
      const stored = record!.credentials as unknown as Record<string, { ciphertext: string }>;
      expect(stored.serverKey.ciphertext).not.toBe('SB-Mid-secret');
      // Should have iv, tag, ciphertext structure
      expect(stored.serverKey).toHaveProperty('iv');
      expect(stored.serverKey).toHaveProperty('tag');
      expect(stored.serverKey).toHaveProperty('ciphertext');
    });
  });

  describe('list', () => {
    it('should return empty list initially', async () => {
      const result = await store.list();
      expect(result).toEqual([]);
    });

    it('should list all provider IDs', async () => {
      await store.set('midtrans', { serverKey: 'key1' });
      await store.set('xendit', { apiKey: 'key2' });
      await store.set('duitku', { apiKey: 'key3' });

      const result = await store.list();
      expect(result.sort()).toEqual(['duitku', 'midtrans', 'xendit']);
    });
  });

  describe('delete', () => {
    it('should delete stored credentials', async () => {
      await store.set('midtrans', { serverKey: 'key' });
      await store.delete('midtrans');

      const result = await store.get('midtrans');
      expect(result).toBeNull();
    });

    it('should not throw when deleting non-existent provider', async () => {
      await expect(store.delete('nonexistent')).resolves.toBeUndefined();
    });
  });

  describe('has', () => {
    it('should return true when credentials exist', async () => {
      await store.set('midtrans', { serverKey: 'key' });
      expect(await store.has('midtrans')).toBe(true);
    });

    it('should return false when credentials do not exist', async () => {
      expect(await store.has('midtrans')).toBe(false);
    });
  });
});

describe('NullCredentialStore', () => {
  const store = new NullCredentialStore();

  it('should return null for get', async () => {
    expect(await store.get('any')).toBeNull();
  });

  it('should return empty list', async () => {
    expect(await store.list()).toEqual([]);
  });

  it('should return false for has', async () => {
    expect(await store.has('any')).toBe(false);
  });

  it('should throw on set', async () => {
    await expect(store.set('any', { key: 'val' })).rejects.toThrow('CredentialStore is not configured');
  });

  it('should not throw on delete', async () => {
    await expect(store.delete('any')).resolves.toBeUndefined();
  });
});

describe('InMemoryCredentialRepository', () => {
  let repo: InMemoryCredentialRepository;

  beforeEach(() => {
    repo = new InMemoryCredentialRepository();
  });

  it('should save and find by providerId', async () => {
    const record = {
      id: 'test-1',
      providerId: 'midtrans',
      credentials: { serverKey: 'encrypted-data' },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await repo.save(record);
    const found = await repo.findByProviderId('midtrans');
    expect(found).toEqual(record);
  });

  it('should find all records', async () => {
    await repo.save({
      id: '1',
      providerId: 'midtrans',
      credentials: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await repo.save({
      id: '2',
      providerId: 'xendit',
      credentials: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const all = await repo.findAll();
    expect(all).toHaveLength(2);
  });

  it('should delete by providerId', async () => {
    await repo.save({
      id: '1',
      providerId: 'midtrans',
      credentials: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await repo.deleteByProviderId('midtrans');
    const found = await repo.findByProviderId('midtrans');
    expect(found).toBeNull();
  });
});
