import { describe, expect, it } from 'vitest';
import { generateKeyPairSync, createVerify } from 'node:crypto';
import { createNicepaySignature, sha256Hex, verifyNicepaySignature } from '../src/signature';

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const privatePem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
const publicPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();

describe('Nicepay signatures', () => {
  it('hashes minified JSON deterministically', () => {
    expect(sha256Hex('{ "a": 1 }')).toBe(sha256Hex('{"a":1}'));
  });

  it('creates verifiable RSA signature', () => {
    const body = JSON.stringify({ partnerServiceId: '', virtualAccountNo: '', trxId: 'order-1' });
    const path = '/nicepay/api/v1.0/transfer-va/create-va';
    const ts = '2024-03-14T07:49:28+07:00';
    const sig = createNicepaySignature('POST', path, body, ts, privatePem);
    const stringToSign = `POST:${path}:${sha256Hex(body)}:${ts}`;
    const v = createVerify('RSA-SHA256');
    v.update(stringToSign, 'utf8');
    v.end();
    expect(v.verify(publicPem, Buffer.from(sig, 'base64'))).toBe(true);
  });

  it('verify helper validates', () => {
    const body = JSON.stringify({ trxId: 'INV-1' });
    const path = '/nicepay/api/v1.0/transfer-va/create-va';
    const ts = '2024-03-14T07:49:28+07:00';
    const sig = createNicepaySignature('POST', path, body, ts, privatePem);
    expect(verifyNicepaySignature('POST', path, body, ts, sig, publicPem)).toBe(true);
    expect(verifyNicepaySignature('POST', path, body.replace('INV-1', 'INV-2'), ts, sig, publicPem)).toBe(false);
  });
});
