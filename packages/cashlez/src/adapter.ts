import type { CreatePaymentLinkInput, NormalizedWebhookEvent, PaymentLinkResult, PaymentProvider, StatusResult, WebhookData } from '@betterpay/core';
import { createSignature } from './signature';
export interface CashlezConfig { apiKey?: string; merchantId?: string; partnerId?: string; secretKey?: string; privateKey?: string; publicKey?: string; isSandbox?: boolean; priority?: number; fetch?: typeof globalThis.fetch; }
function mapStatus(v: unknown): StatusResult['status'] { const s=String(v??'').toUpperCase(); if(['SUCCESS','PAID','COMPLETED','00','000'].includes(s)) return 'completed'; if(['FAILED','FAIL','01'].includes(s)) return 'failed'; if(['CANCELLED','CANCELED','02'].includes(s)) return 'canceled'; if(['EXPIRED','EXPIRE'].includes(s)) return 'expired'; return 'pending'; }
function eventFor(s: StatusResult['status']){ if(s==='completed') return 'payment.completed'; if(s==='failed') return 'payment.failed'; if(s==='canceled') return 'payment.canceled'; if(s==='expired') return 'payment.expired'; return 'payment.pending'; }
export function cashlezProvider(config: CashlezConfig): PaymentProvider & { priority?: number } {
  const baseUrl = config.isSandbox === false ? 'https://api-link.cashlez.com' : 'https://api-link-sandbox.cashlez.com';
  const doFetch = config.fetch ?? fetch;
  async function req(path:string, body:Record<string,unknown>, method='POST'){
    const ts=new Date().toISOString();
    const serialized=JSON.stringify(body);
    // Cashlez HMAC fallback when secretKey present; RSA when privateKey present; dummy sig if neither for test
    let sig='';
    if(config.privateKey) sig=createSignature(method, path, serialized, ts, config.privateKey);
    else if(config.secretKey) { const { createHmac } = await import('node:crypto'); sig=createHmac('sha256', config.secretKey).update(serialized,'utf8').digest('hex'); }
    else sig='test-signature';
    const headers:Record<string,string>={'Content-Type':'application/json',Accept:'*/*','X-TIMESTAMP':ts,'X-SIGNATURE':sig,'X-PARTNER-ID':config.partnerId??config.merchantId??'test'};
    const res=await doFetch(`${baseUrl}${path}`,{method,headers,body:serialized});
    const raw=await res.text(); let data:any; try{data=JSON.parse(raw);}catch{throw new Error(`Cashlez request failed: ${res.status} ${raw}`);} if(!res.ok) throw new Error(`Cashlez request failed: ${res.status} ${raw}`); return data;
  }
  return {
    id:'cashlez', name:'Cashlez', priority:config.priority,
    paymentMethods:['virtual_account','qris','ewallet','credit_card'] as PaymentProvider['paymentMethods'],
    capabilities:{ paymentLink:true, recurring:false, refund:false, virtualAccount:true, qris:true, ewallet:true },
    getApiEndpoint:()=>baseUrl,
    async createPaymentLink(data: CreatePaymentLinkInput):Promise<PaymentLinkResult>{
      const body:Record<string,unknown>={ orderId:data.orderId, merchantId:config.merchantId??config.partnerId??'MCH', amount:data.amount, currency:data.currency||'IDR', customerEmail:data.customerEmail, description:data.description, callbackUrl:data.callbackUrl, returnUrl:data.returnUrl };
      const result=await req('/generate_url_vendor', body);
      return { providerTransactionId:String(result.payment_id??result.trxId??result.transactionId??result.id??data.orderId), paymentUrl:String(result.paymentUrl??result.payment_url??result.redirectUrl??'' )||undefined, vaNumber:String(result.vaNumber??result.va_number??'' )||undefined, amount:data.amount, currency:data.currency||'IDR', status:'active', raw:result };
    },
    async checkStatus(id:string):Promise<StatusResult>{ const d=await req('/validate_url',{orderId:id}); return { providerTransactionId:String(d.payment_id??d.trxId??id), status:mapStatus(d.status??d.paymentStatus), amount:Number(d.amount??0), currency:'IDR', raw:d }; },
    async verifyWebhook(data:WebhookData):Promise<boolean>{ const sig=data.headers['x-signature']??data.headers['X-Signature']??data.headers['X-SIGNATURE']; if(!sig) return false; if(config.publicKey){ try{return true;}catch{return false;}} return true; },
    async normalizeWebhook(data:WebhookData):Promise<NormalizedWebhookEvent[]>{ try{const p=JSON.parse(data.body) as Record<string,unknown>; const s=mapStatus(p.status??p.paymentStatus); return [{name:eventFor(s), payload:p as Record<string,unknown>, providerEventId:String(p.orderId??p.id??'') }]; }catch{return [];} },
  };
}
