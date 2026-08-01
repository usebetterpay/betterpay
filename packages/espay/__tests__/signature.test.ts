import { describe, expect, it } from 'vitest';
import { generateKeyPairSync, createVerify } from 'node:crypto';
import { createEspayAsymmetricSignature, sha256Hex, verifyEspayAsymmetricSignature, createEspayHashSignature, verifyEspayHashSignatureSync } from '../src/signature';

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const privatePem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
const publicPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();

describe('Espay signatures', () => {
  it('hashes minified JSON deterministically', () => {
    expect(sha256Hex('{ "a": 1 }')).toBe(sha256Hex('{"a":1}'));
  });

  it('creates verifiable RSA asymmetric signature', () => {
    const body = JSON.stringify({ partnerReferenceNo: 'order-1', amount: { value: '10000.00', currency: 'IDR' } });
    const path = '/apimerchant/v1.0/debit/payment-host-to-host';
    const ts = '2024-03-14T07:49:28+07:00';
    const sig = createEspayAsymmetricSignature('POST', path, body, ts, privatePem);
    const stringToSign = `POST:${path}:${sha256Hex(body)}:${ts}`;
    const v = createVerify('RSA-SHA256');
    v.update(stringToSign, 'utf8');
    v.end();
    expect(v.verify(publicPem, Buffer.from(sig, 'base64'))).toBe(true);
  });

  it('verify helper validates correctly', () => {
    const body = JSON.stringify({ trxId: 'INV-1' });
    const path = '/v1.0/transfer-va/create-va';
    const ts = '2024-03-14T07:49:28+07:00';
    const sig = createEspayAsymmetricSignature('POST', path, body, ts, privatePem);
    expect(verifyEspayAsymmetricSignature('POST', path, body, ts, sig, publicPem)).toBe(true);
    expect(verifyEspayAsymmetricSignature('POST', path, body.replace('INV-1', 'INV-2'), ts, sig, publicPem)).toBe(false);
  });

  it('hash signature is deterministic and verifiable', () => {
    const body = JSON.stringify({ merchantId: 'M1', amount: 10000 });
    const secret = 'supersecret';
    const sig = createEspayHashSignature(body, secret);
    expect(verifyEspayHashSignatureSync(body, sig, secret)).toBe(true);
    expect(verifyEspayHashSignatureSync(body, sig, 'wrong')).toBe(false);
  });
});
