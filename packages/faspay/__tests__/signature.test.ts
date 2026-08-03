import { describe, expect, it } from 'vitest';
import { generateKeyPairSync, createVerify } from 'node:crypto';
import { createFaspayHashSignature, verifyFaspayHashSignature, createFaspaySnapSignature, sha256Hex } from '../src/signature';

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const privatePem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
const publicPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();

describe('Faspay signatures', () => {
  it('hash signature is deterministic', () => {
    const sig = createFaspayHashSignature('MCH-1', 'INV-1', 10000, 'secret');
    expect(verifyFaspayHashSignature('MCH-1', 'INV-1', 10000, sig, 'secret')).toBe(true);
    expect(verifyFaspayHashSignature('MCH-1', 'INV-1', 10000, sig, 'wrong')).toBe(false);
  });

  it('hash signature rejects tampered amount', () => {
    const sig = createFaspayHashSignature('MCH-1', 'INV-1', 10000, 'secret');
    expect(verifyFaspayHashSignature('MCH-1', 'INV-1', 9999, sig, 'secret')).toBe(false);
  });

  it('SNAP RSA signature is verifiable', () => {
    const body = JSON.stringify({ merchantId: 'MCH-1', merchantTranId: 'INV-1' });
    const path = '/payment';
    const ts = '2024-03-14T07:49:28+07:00';
    const sig = createFaspaySnapSignature('POST', path, body, ts, privatePem);
    const stringToSign = `POST:${path}:${sha256Hex(body)}:${ts}`;
    const v = createVerify('RSA-SHA256');
    v.update(stringToSign, 'utf8');
    v.end();
    expect(v.verify(publicPem, Buffer.from(sig, 'base64'))).toBe(true);
  });
});
