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

// Legacy hash: Faspay signature = SHA256 or HMAC. For generic, use HMAC-SHA256
// Real Faspay docs: signature of merchantId + merchantTranId + amount. We provide HMAC variant.
export function createFaspayHashSignature(
  merchantId: string,
  merchantTranId: string,
  amount: number | string,
  secret: string,
): string {
  const message = `${merchantId}${merchantTranId}${amount}`;
  return createHmac('sha256', secret).update(message, 'utf8').digest('hex');
}

export function verifyFaspayHashSignature(
  merchantId: string,
  merchantTranId: string,
  amount: number | string,
  signature: string,
  secret: string,
): boolean {
  if (!signature || !secret) return false;
  const expected = createFaspayHashSignature(merchantId, merchantTranId, amount, secret);
  const a = Buffer.from(signature.toLowerCase(), 'utf8');
  const b = Buffer.from(expected.toLowerCase(), 'utf8');
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a[i]! ^ b[i]!;
  return result === 0;
}

// SNAP RSA (for migrated Faspay merchant)
export function createFaspaySnapSignature(
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

export function verifyFaspaySnapSignature(
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

export function verifyFaspayWebhook(
  body: string,
  headers: Record<string, string>,
  secret: string,
  publicKey?: string,
): boolean {
  const sig = headers['x-signature'] ?? headers['X-SIGNATURE'];
  if (!sig) return false;
  // Try SNAP first if publicKey present
  if (publicKey) {
    const ts = headers['x-timestamp'] ?? headers['X-TIMESTAMP'] ?? '';
    if (ts && verifyFaspaySnapSignature('POST', '/payment', body, ts, sig, publicKey)) return true;
  }
  // Fallback to hash: body contains merchantId etc
  try {
    const p = JSON.parse(body) as Record<string, unknown>;
    const merchantId = String(p.merchantId ?? p.merchantid ?? '');
    const merchantTranId = String(p.merchantTranId ?? p.merchant_tranid ?? p.trxId ?? p.orderId ?? '');
    const amount = String(p.amount ?? p.totalAmount ?? '');
    return verifyFaspayHashSignature(merchantId, merchantTranId, amount, sig, secret);
  } catch {
    return false;
  }
}
