import { describe, it, expect } from 'vitest';
import {
  CredentialEncryption,
  createCredentialEncryption,
  validateMasterKey,
} from '../src/security/credential-encryption';

describe('CredentialEncryption', () => {
  const masterKey = 'test-master-key-with-enough-length-1234567890';
  let encryption: CredentialEncryption;

  beforeEach(() => {
    encryption = new CredentialEncryption(masterKey);
  });

  describe('encrypt/decrypt', () => {
    it('should encrypt and decrypt string', () => {
      const plaintext = 'my-secret-api-key';
      const encrypted = encryption.encrypt(plaintext);
      const decrypted = encryption.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should produce different ciphertexts for same plaintext', () => {
      const plaintext = 'same-secret';
      const encrypted1 = encryption.encrypt(plaintext);
      const encrypted2 = encryption.encrypt(plaintext);

      expect(encrypted1.ciphertext).not.toBe(encrypted2.ciphertext);
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
    });

    it('should handle empty string', () => {
      const plaintext = '';
      const encrypted = encryption.encrypt(plaintext);
      const decrypted = encryption.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle unicode characters', () => {
      const plaintext = '密钥 🔐 secret';
      const encrypted = encryption.encrypt(plaintext);
      const decrypted = encryption.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle long strings', () => {
      const plaintext = 'a'.repeat(10000);
      const encrypted = encryption.encrypt(plaintext);
      const decrypted = encryption.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should fail with wrong master key', () => {
      const plaintext = 'secret';
      const encrypted = encryption.encrypt(plaintext);

      const wrongEncryption = new CredentialEncryption('different-master-key-with-enough-length');
      expect(() => wrongEncryption.decrypt(encrypted)).toThrow();
    });

    it('should fail with tampered ciphertext', () => {
      const plaintext = 'secret';
      const encrypted = encryption.encrypt(plaintext);
      encrypted.ciphertext = 'tampered' + encrypted.ciphertext;

      expect(() => encryption.decrypt(encrypted)).toThrow();
    });

    it('should fail with tampered tag', () => {
      const plaintext = 'secret';
      const encrypted = encryption.encrypt(plaintext);
      encrypted.tag = 'tampered' + encrypted.tag;

      expect(() => encryption.decrypt(encrypted)).toThrow();
    });
  });

  describe('encryptAll/decryptAll', () => {
    it('should encrypt and decrypt multiple credentials', () => {
      const credentials = {
        apiKey: 'key-123',
        apiSecret: 'secret-456',
        webhookSecret: 'webhook-789',
      };

      const encrypted = encryption.encryptAll(credentials);
      const decrypted = encryption.decryptAll(encrypted);

      expect(decrypted).toEqual(credentials);
    });

    it('should handle empty object', () => {
      const credentials = {};
      const encrypted = encryption.encryptAll(credentials);
      const decrypted = encryption.decryptAll(encrypted);

      expect(decrypted).toEqual(credentials);
    });

    it('should handle decryption failures gracefully', () => {
      const encrypted = {
        good: encryption.encrypt('secret'),
        bad: {
          iv: 'invalid',
          tag: 'invalid',
          ciphertext: 'invalid',
        },
      };

      const decrypted = encryption.decryptAll(encrypted);

      expect(decrypted.good).toBe('secret');
      expect(decrypted.bad).toBe('');
    });
  });
});

describe('createCredentialEncryption', () => {
  it('should create instance with valid master key', () => {
    const encryption = createCredentialEncryption('valid-master-key-with-enough-length-123');
    expect(encryption).toBeInstanceOf(CredentialEncryption);
  });

  it('should throw with short master key', () => {
    expect(() => createCredentialEncryption('short')).toThrow('at least 32 characters');
  });

  it('should throw with empty master key', () => {
    expect(() => createCredentialEncryption('')).toThrow('at least 32 characters');
  });
});

describe('validateMasterKey', () => {
  it('should validate strong master key', () => {
    const result = validateMasterKey('MyStr0ng!Pass#With$Special%Chars&456');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject empty master key', () => {
    const result = validateMasterKey('');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Master key is required');
  });

  it('should reject short master key', () => {
    const result = validateMasterKey('shortkey');
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('at least 32 characters'))).toBe(true);
  });

  it('should reject weak patterns', () => {
    const result = validateMasterKey('mypassword12345678901234567890ab');
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('weak pattern'))).toBe(true);
  });

  it('should reject low entropy keys', () => {
    const result = validateMasterKey('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('mix of'))).toBe(true);
  });
});
