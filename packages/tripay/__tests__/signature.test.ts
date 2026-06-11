import { describe, it, expect } from 'vitest';
import {
  generateTransactionSignature,
  generateOpenPaymentSignature,
  generateCallbackSignature,
  verifyCallbackSignature,
} from '../src/signature';

describe('Tripay Signature', () => {
  const merchantCode = 'T0001';
  const privateKey = 'ytf6ooi2gmlNPfpchd94jDOk8hRWOu';
  const merchantRef = 'INV55567';
  const amount = 1500000;

  describe('generateTransactionSignature', () => {
    it('should generate correct signature for transaction', () => {
      const signature = generateTransactionSignature(
        merchantCode,
        merchantRef,
        amount,
        privateKey
      );

      expect(signature).toBe(
        '9f167eba844d1fcb369404e2bda53702e2f78f7aa12e91da6715414e65b8c86a'
      );
    });

    it('should generate different signature for different amount', () => {
      const signature1 = generateTransactionSignature(
        merchantCode,
        merchantRef,
        1000000,
        privateKey
      );

      const signature2 = generateTransactionSignature(
        merchantCode,
        merchantRef,
        2000000,
        privateKey
      );

      expect(signature1).not.toBe(signature2);
    });

    it('should generate different signature for different merchant ref', () => {
      const signature1 = generateTransactionSignature(
        merchantCode,
        'INV001',
        amount,
        privateKey
      );

      const signature2 = generateTransactionSignature(
        merchantCode,
        'INV002',
        amount,
        privateKey
      );

      expect(signature1).not.toBe(signature2);
    });
  });

  describe('generateOpenPaymentSignature', () => {
    it('should generate correct signature for open payment', () => {
      const channel = 'BCAVA';
      const signature = generateOpenPaymentSignature(
        merchantCode,
        channel,
        merchantRef,
        privateKey
      );

      expect(signature).toBeDefined();
      expect(typeof signature).toBe('string');
      expect(signature.length).toBe(64); // SHA256 hex length
    });

    it('should generate different signature for different channel', () => {
      const signature1 = generateOpenPaymentSignature(
        merchantCode,
        'BCAVA',
        merchantRef,
        privateKey
      );

      const signature2 = generateOpenPaymentSignature(
        merchantCode,
        'BNIVA',
        merchantRef,
        privateKey
      );

      expect(signature1).not.toBe(signature2);
    });
  });

  describe('generateCallbackSignature', () => {
    it('should generate signature from payload', () => {
      const payload = JSON.stringify({
        reference: 'T0001000000000000006',
        merchant_ref: 'INV364654',
        status: 'PAID',
      });

      const signature = generateCallbackSignature(payload, privateKey);

      expect(signature).toBeDefined();
      expect(typeof signature).toBe('string');
      expect(signature.length).toBe(64);
    });

    it('should generate different signature for different payload', () => {
      const payload1 = JSON.stringify({ status: 'PAID' });
      const payload2 = JSON.stringify({ status: 'FAILED' });

      const signature1 = generateCallbackSignature(payload1, privateKey);
      const signature2 = generateCallbackSignature(payload2, privateKey);

      expect(signature1).not.toBe(signature2);
    });
  });

  describe('verifyCallbackSignature', () => {
    it('should verify valid signature', () => {
      const payload = JSON.stringify({
        reference: 'T0001000000000000006',
        merchant_ref: 'INV364654',
        status: 'PAID',
      });

      const signature = generateCallbackSignature(payload, privateKey);
      const isValid = verifyCallbackSignature(payload, signature, privateKey);

      expect(isValid).toBe(true);
    });

    it('should reject invalid signature', () => {
      const payload = JSON.stringify({
        reference: 'T0001000000000000006',
        merchant_ref: 'INV364654',
        status: 'PAID',
      });

      const isValid = verifyCallbackSignature(
        payload,
        'invalid_signature_here',
        privateKey
      );

      expect(isValid).toBe(false);
    });

    it('should reject tampered payload', () => {
      const originalPayload = JSON.stringify({
        reference: 'T0001000000000000006',
        status: 'PAID',
      });

      const signature = generateCallbackSignature(originalPayload, privateKey);

      const tamperedPayload = JSON.stringify({
        reference: 'T0001000000000000006',
        status: 'FAILED', // Changed
      });

      const isValid = verifyCallbackSignature(
        tamperedPayload,
        signature,
        privateKey
      );

      expect(isValid).toBe(false);
    });

    it('should reject signature with wrong length', () => {
      const payload = JSON.stringify({ status: 'PAID' });
      const isValid = verifyCallbackSignature(payload, 'short', privateKey);

      expect(isValid).toBe(false);
    });
  });
});
