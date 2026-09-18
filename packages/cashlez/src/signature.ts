import { createHash, createSign, createVerify } from 'node:crypto';
function minifyJson(body: string): string { try { return JSON.stringify(JSON.parse(body)); } catch { return body; } }
export function sha256Hex(body: string): string { return createHash('sha256').update(minifyJson(body),'utf8').digest('hex').toLowerCase(); }
export function createSignature(method: string, path: string, body: string, timestamp: string, privateKey: string): string {
  const digest = sha256Hex(body); const stringToSign = `${method.toUpperCase()}:${path}:${digest}:${timestamp}`;
  const signer = createSign('RSA-SHA256'); signer.update(stringToSign,'utf8'); signer.end(); return signer.sign(privateKey).toString('base64');
}
export function verifySignature(method: string, path: string, body: string, timestamp: string, signature: string, publicKey: string): boolean {
  if (!signature||!publicKey) return false; const digest = sha256Hex(body); const stringToSign = `${method.toUpperCase()}:${path}:${digest}:${timestamp}`;
  const verifier = createVerify('RSA-SHA256'); verifier.update(stringToSign,'utf8'); verifier.end(); try { return verifier.verify(publicKey, Buffer.from(signature,'base64')); } catch { return false; }
}
