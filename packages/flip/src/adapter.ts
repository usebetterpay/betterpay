import type { CreatePaymentLinkInput, NormalizedWebhookEvent, PaymentLinkResult, PaymentProvider, StatusResult, WebhookData } from '@betterpay/core';
import { verifySignature } from './signature';
export interface FlipConfig { apiKey: string; isSandbox?: boolean; priority?: number; fetch?: typeof globalThis.fetch; }
function mapStatus(v: unknown): StatusResult['status'] { const s=String(v??'').toUpperCase(); if(['SUCCESS','COMPLETED','00'].includes(s)) return 'completed'; if(['FAILED','FAIL'].includes(s)) return 'failed'; if(['CANCELLED','CANCELED'].includes(s)) return 'canceled'; if(['EXPIRED'].includes(s)) return 'expired'; return 'pending'; }
function eventFor(s: StatusResult['status']){ if(s==='completed') return 'payout.completed'; if(s==='failed') return 'payout.failed'; if(s==='canceled') return 'payout.canceled'; return 'payout.pending'; }
export function flipProvider(config: FlipConfig): PaymentProvider & { priority?: number; disburse(data:{bankCode:string;accountNumber:string;amount:number;remark?:string}):Promise<{providerTransactionId:string;status:string;raw:unknown}> } {
  const baseUrl = config.isSandbox ? 'https://api-sandbox.flip.id' : 'https://api.flip.id';
  const doFetch = config.fetch ?? fetch;
  async function req(path:string, body:Record<string,unknown>){ const headers:Record<string,string>={'Content-Type':'application/json'}; const res=await doFetch(`${baseUrl}${path}`,{method:'POST',headers,body:JSON.stringify(body)}); const raw=await res.text(); let data:any; try{data=JSON.parse(raw);}catch{throw new Error(`Flip request failed: ${res.status} ${raw}`);} if(!res.ok) throw new Error(`Flip request failed: ${res.status} ${raw}`); return data; }
  return {
    id:'flip', name:'Flip', priority:config.priority,
    paymentMethods:['bank_transfer'] as PaymentProvider['paymentMethods'],
    capabilities:{ paymentLink:false, recurring:false, refund:false, payout:true, weakWebhookAuth:true },
    getApiEndpoint:()=>baseUrl,
    async createPaymentLink(_d: CreatePaymentLinkInput):Promise<PaymentLinkResult>{ throw new Error('Flip is a payout provider — use disburse() instead of createPaymentLink()'); },
    async checkStatus(id:string):Promise<StatusResult>{ const d=await req('/api/v1/disbursement/status',{id}); return { providerTransactionId:String(d.id??id), status:mapStatus(d.status), amount:Number(d.amount??0), currency:'IDR', raw:d }; },
    async verifyWebhook(data:WebhookData):Promise<boolean>{ const sig=data.headers['x-signature']??data.headers['X-Signature']; if(!sig) return false; try{const p2=JSON.parse(data.body); return verifySignature(String(p2.id??''), String(p2.amount??''), String(p2.status??''), sig, config.apiKey);}catch{return false;} },
    async normalizeWebhook(data:WebhookData):Promise<NormalizedWebhookEvent[]>{ try{const p2=JSON.parse(data.body) as Record<string,unknown>; const s=mapStatus(p2.status); return [{name:eventFor(s), payload:p2 as Record<string,unknown>, providerEventId:String(p2.id??'') }]; }catch{return [];} },
    async disburse(data:{bankCode:string;accountNumber:string;amount:number;remark?:string}){ const d=await req('/api/v1/disbursement',{bank_code:data.bankCode, account_number:data.accountNumber, amount:data.amount, remark:data.remark}); return {providerTransactionId:String(d.id??''), status:String(d.status??'pending'), raw:d}; },
  };
}
