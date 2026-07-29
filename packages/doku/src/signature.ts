import { createHash, createHmac, createSign, createVerify, timingSafeEqual } from 'node:crypto';

function minifyJson(body: string): string {
  try { return JSON.stringify(JSON.parse(body)); } catch { return body; }
}

export function sha256Hex(body: string): string {
  return createHash('sha256').update(minifyJson(body), 'utf8').digest('hex').toLowerCase();
}

export function createDokuTokenSignature(clientId: string, timestamp: string, privateKey: string): string {
  const signer = createSign('RSA-SHA256');
  signer.update(`${clientId}|${timestamp}`);
  signer.end();
  return signer.sign(privateKey).toString('base64');
}

export function createDokuTransactionSignature(
  method: string, path: string, body: string, _accessToken: string, timestamp: string, privateKey: string,
): string {
  const signer = createSign('RSA-SHA256');
  signer.update(`${method.toUpperCase()}:${path}:${sha256Hex(body)}:${timestamp}`);
  signer.end();
  return signer.sign(privateKey).toString('base64');
}

export function createDokuSymmetricSignature(
  method: string, path: string, _body: string, accessToken: string, timestamp: string, clientSecret: string,
): string {
  const input = `${method.toUpperCase()}:${path}:${accessToken}:${sha256Hex(_body)}:${timestamp}`;
  return createHmac('sha512', clientSecret).update(input, 'utf8').digest('base64');
}

export function verifyDokuWebhook(body: string, headers: Record<string, string>, publicKey: string): boolean {
  void body;
  const signature = headers['x-signature'] ?? headers['X-SIGNATURE'];
  const clientId = headers['client-id'] ?? headers['Client-Id'] ?? headers['x-client-key'] ?? headers['X-CLIENT-KEY'];
  const timestamp = headers['request-timestamp'] ?? headers['Request-Timestamp'] ?? headers['x-timestamp'] ?? headers['X-TIMESTAMP'];
  if (!signature || !clientId || !timestamp || !publicKey) return false;
  const verifier = createVerify('RSA-SHA256');
  verifier.update(`${clientId}|${timestamp}`);
  verifier.end();
  try { return verifier.verify(publicKey, Buffer.from(signature.replace(/^Bearer\s+/i, ''), 'base64')); } catch { return false; }
}

export function verifyDokuHmacSignature(value: string, expected: string): boolean {
  const a = Buffer.from(value); const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
