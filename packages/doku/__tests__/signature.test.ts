import { describe, expect, it } from 'vitest';
import { generateKeyPairSync, createVerify } from 'node:crypto';
import { createDokuTokenSignature, createDokuTransactionSignature, sha256Hex } from '../src/signature';

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const privatePem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();

describe('DOKU signatures', () => {
  it('hashes the exact minified JSON body', () => {
    expect(sha256Hex('{ "amount": 100 }')).toBe(sha256Hex('{"amount":100}'));
  });

  it('creates a verifiable RSA token signature', () => {
    const signature = createDokuTokenSignature('MCH-1', '2026-07-29T00:00:00Z', privatePem);
    const verify = createVerify('RSA-SHA256');
    verify.update('MCH-1|2026-07-29T00:00:00Z');
    verify.end();
    expect(verify.verify(publicKey, Buffer.from(signature, 'base64'))).toBe(true);
  });

  it('creates a verifiable RSA transaction signature with DOKU digest formula', () => {
    const body = JSON.stringify({ amount: 100, currency: 'IDR' });
    const path = '/virtual-accounts/bi-snap-va/v1/transfer-va/create-va';
    const timestamp = '2026-07-29T00:00:00Z';
    const token = 'token';
    const signature = createDokuTransactionSignature('POST', path, body, token, timestamp, privatePem);
    const verify = createVerify('RSA-SHA256');
    verify.update(`POST:${path}:${sha256Hex(body)}:${timestamp}`);
    verify.end();
    expect(verify.verify(publicKey, Buffer.from(signature, 'base64'))).toBe(true);
  });
});
