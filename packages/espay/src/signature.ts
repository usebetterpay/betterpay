import { createHash, createHmac, createSign, createVerify } from 'node:crypto';

function minifyJson(body: string): string {
  try {
    return JSON.stringify(JSON.parse(body));
  } catch {
    return body;
  }
}

export function sha256Hex(body: string): string {
  return createHash('sha256').update(minifyJson(body), 'utf8').digest('hex').toLowerCase();
}

// SNAP Asymmetric RSA-SHA256 (same as Winpay/DOKU)
export function createEspayAsymmetricSignature(
  method: string,
  path: string,
  body: string,
  timestamp: string,
  privateKey: string,
): string {
  const digest = sha256Hex(body);
  const stringToSign = `${method.toUpperCase()}:${path}:${digest}:${timestamp}`;
  const signer = createSign('RSA-SHA256');
  signer.update(stringToSign, 'utf8');
  signer.end();
  return signer.sign(privateKey).toString('base64');
}

export function verifyEspayAsymmetricSignature(
  method: string,
  path: string,
  body: string,
  timestamp: string,
  signature: string,
  publicKey: string,
): boolean {
  if (!signature || !publicKey) return false;
  const digest = sha256Hex(body);
  const stringToSign = `${method.toUpperCase()}:${path}:${digest}:${timestamp}`;
  const verifier = createVerify('RSA-SHA256');
  verifier.update(stringToSign, 'utf8');
  verifier.end();
  try {
    return verifier.verify(publicKey, Buffer.from(signature, 'base64'));
  } catch {
    return false;
  }
}

// Non-SNAP Hash-Based (HMAC SHA256)
export function createEspayHashSignature(body: string, secret: string): string {
  return createHmac('sha256', secret).update(minifyJson(body), 'utf8').digest('hex');
}



export function verifyEspayHashSignatureSync(body: string, signature: string, secret: string): boolean {
  if (!signature || !secret) return false;
  const expected = createEspayHashSignature(body, secret);
  const a = Buffer.from(signature.toLowerCase(), 'utf8');
  const b = Buffer.from(expected.toLowerCase(), 'utf8');
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a[i]! ^ b[i]!;
  return result === 0;
}
