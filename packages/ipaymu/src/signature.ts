import { createHmac, createHash } from 'node:crypto';
function minifyJson(body: string): string { try { return JSON.stringify(JSON.parse(body)); } catch { return body; } }
export function sha256Hex(body: string): string { return createHash('sha256').update(minifyJson(body),'utf8').digest('hex').toLowerCase(); }
export function createSignature(merchantId: string, orderId: string, amount: number | string, secret: string): string {
  return createHmac('sha256', secret).update(`${merchantId}${orderId}${amount}`, 'utf8').digest('hex');
}
export function verifySignature(merchantId: string, orderId: string, amount: number | string, signature: string, secret: string): boolean {
  const expected = createSignature(merchantId, orderId, amount, secret);
  const a = Buffer.from(signature.toLowerCase(),'utf8'); const b = Buffer.from(expected.toLowerCase(),'utf8');
  if (a.length !== b.length) return false; let r=0; for(let i=0;i<a.length;i++) r|=a[i]!^b[i]!; return r===0;
}
