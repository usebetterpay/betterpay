import { createHmac, createHash } from 'node:crypto';
function minifyJson(body: string): string { try { return JSON.stringify(JSON.parse(body)); } catch { return body; } }
export function sha256Hex(body: string): string { return createHash('sha256').update(minifyJson(body),'utf8').digest('hex').toLowerCase(); }
export function createSignature(partnerId: string, timestamp: string, body: string, secret: string, token?: string): string {
  const payload = body ? sha256Hex(body) : '';
  const stringToSign = `${partnerId}:${timestamp}:${payload}:${token ?? ''}`;
  return createHmac('sha512', secret).update(stringToSign,'utf8').digest('hex');
}
export function verifySignature(partnerId: string, timestamp: string, body: string, signature: string, secret: string, token?: string): boolean {
  const expected = createSignature(partnerId, timestamp, body, secret, token);
  const a = Buffer.from(signature.toLowerCase(),'utf8'); const b = Buffer.from(expected.toLowerCase(),'utf8');
  if (a.length !== b.length) return false; let r=0; for(let i=0;i<a.length;i++) r|=a[i]!^b[i]!; return r===0;
}
