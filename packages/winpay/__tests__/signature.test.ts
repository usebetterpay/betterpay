import { describe, expect, it } from 'vitest';
import { generateKeyPairSync, createVerify } from 'node:crypto';
import { createWinpaySignature, sha256Hex, verifyWinpaySignature } from '../src/signature';

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const privatePem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
const publicPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();

describe('Winpay signatures', () => {
  it('hashes the exact minified JSON body (whitespace agnostic)', () => {
    expect(sha256Hex('{ "amount": 100 }')).toBe(sha256Hex('{"amount":100}'));
  });

  it('creates a verifiable RSA-SHA256 signature with SNAP formula', () => {
    const body = JSON.stringify({ customerNo: '00000009', virtualAccountName: 'Test' });
    const path = '/v1.0/transfer-va/create-va';
    const timestamp = '2024-01-11T08:57:55+07:00';
    const signature = createWinpaySignature('POST', path, body, timestamp, privatePem);
    const stringToSign = `POST:${path}:${sha256Hex(body)}:${timestamp}`;
    const verifier = createVerify('RSA-SHA256');
    verifier.update(stringToSign, 'utf8');
    verifier.end();
    expect(verifier.verify(publicPem, Buffer.from(signature, 'base64'))).toBe(true);
  });

  it('verify helper accepts valid signature and rejects tampered body', () => {
    const body = JSON.stringify({ trxId: 'INV-1', amount: { value: '10000.00', currency: 'IDR' } });
    const path = '/v1.0/transfer-va/create-va';
    const ts = '2024-01-11T08:57:55+07:00';
    const sig = createWinpaySignature('POST', path, body, ts, privatePem);
    expect(verifyWinpaySignature('POST', path, body, ts, sig, publicPem)).toBe(true);
    expect(verifyWinpaySignature('POST', path, body.replace('10000.00', '99999.00'), ts, sig, publicPem)).toBe(false);
  });
});
