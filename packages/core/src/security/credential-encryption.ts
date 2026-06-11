// Encrypted Credential Storage using AES-256-GCM
// Securely store provider API keys and secrets

import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';

export interface EncryptedValue {
  iv: string; // Base64 encoded initialization vector
  tag: string; // Base64 encoded authentication tag
  ciphertext: string; // Base64 encoded encrypted data
}

export class CredentialEncryption {
  private key: Buffer;

  constructor(masterKey: string) {
    // Derive 32-byte key from master key using SHA-256
    this.key = createHash('sha256').update(masterKey).digest();
  }

  /**
   * Encrypt a value using AES-256-GCM.
   */
  encrypt(plaintext: string): EncryptedValue {
    const iv = randomBytes(16); // 128-bit IV
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    const tag = cipher.getAuthTag();

    return {
      iv: iv.toString('base64'),
      tag: tag.toString('base64'),
      ciphertext: encrypted,
    };
  }

  /**
   * Decrypt a value using AES-256-GCM.
   */
  decrypt(encrypted: EncryptedValue): string {
    const iv = Buffer.from(encrypted.iv, 'base64');
    const tag = Buffer.from(encrypted.tag, 'base64');
    const decipher = createDecipheriv('aes-256-gcm', this.key, iv);

    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encrypted.ciphertext, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Encrypt multiple credentials at once.
   */
  encryptAll(credentials: Record<string, string>): Record<string, EncryptedValue> {
    const result: Record<string, EncryptedValue> = {};
    for (const [key, value] of Object.entries(credentials)) {
      result[key] = this.encrypt(value);
    }
    return result;
  }

  /**
   * Decrypt multiple credentials at once.
   */
  decryptAll(encrypted: Record<string, EncryptedValue>): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(encrypted)) {
      try {
        result[key] = this.decrypt(value);
      } catch (error) {
        result[key] = ''; // Return empty string on decryption failure
      }
    }
    return result;
  }
}

/**
 * Create credential encryption instance.
 * @param masterKey - Master encryption key (should be from environment variable)
 */
export function createCredentialEncryption(masterKey: string): CredentialEncryption {
  if (!masterKey || masterKey.length < 32) {
    throw new Error('Master key must be at least 32 characters long');
  }
  return new CredentialEncryption(masterKey);
}

/**
 * Validate that a master key is secure enough.
 */
export function validateMasterKey(masterKey: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!masterKey) {
    errors.push('Master key is required');
    return { valid: false, errors };
  }

  if (masterKey.length < 32) {
    errors.push('Master key must be at least 32 characters');
  }

  // Check for common weak patterns
  const weakPatterns = ['password', 'secret', 'key', '123', 'abc', 'qwerty'];
  const lower = masterKey.toLowerCase();
  for (const pattern of weakPatterns) {
    if (lower.includes(pattern)) {
      errors.push(`Master key contains weak pattern: "${pattern}"`);
      break;
    }
  }

  // Check entropy (simple check: should have mix of char types)
  const hasLower = /[a-z]/.test(masterKey);
  const hasUpper = /[A-Z]/.test(masterKey);
  const hasNumber = /[0-9]/.test(masterKey);
  const hasSpecial = /[^a-zA-Z0-9]/.test(masterKey);

  const entropyScore = Number(hasLower) + Number(hasUpper) + Number(hasNumber) + Number(hasSpecial);
  if (entropyScore < 3) {
    errors.push('Master key should contain mix of lowercase, uppercase, numbers, and special characters');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
