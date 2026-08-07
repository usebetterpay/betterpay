import type { CreatePaymentLinkInput, NormalizedWebhookEvent, PaymentLinkResult, PaymentProvider, StatusResult, WebhookData } from '@betterpay/core';
import { createSignature, verifySignature } from './signature';
export interface iPaymuConfig { apiKey?: string; merchantId?: string; partnerId?: string; secretKey?: string; privateKey?: string; publicKey?: string; isSandbox?: boolean; priority?: number; fetch?: typeof globalThis.fetch; }
function mapStatus(v: unknown): StatusResult['status'] { const s=String(v??'').toUpperCase(); if(['SUCCESS','PAID','COMPLETED','00','000'].includes(s)) return 'completed'; if(['FAILED','FAIL','01'].includes(s)) return 'failed'; if(['CANCELLED','CANCELED','02'].includes(s)) return 'canceled'; if(['EXPIRED','EXPIRE'].includes(s)) return 'expired'; return 'pending'; }
function eventFor(s: StatusResult['status']){ if(s==='completed') return 'payment.completed'; if(s==='failed') return 'payment.failed'; if(s==='canceled') return 'payment.canceled'; if(s==='expired') return 'payment.expired'; return 'payment.pending'; }
export function ipaymuProvider(config: iPaymuConfig): PaymentProvider & { priority?: number } {
  const baseUrl = config.isSandbox === false ? 'https://my.ipaymu.com' : 'https://sandbox.ipaymu.com';
  const doFetch = config.fetch ?? fetch;
  async function req(path:string, body:Record<string,unknown>, method='POST'){ const ts=new Date().toISOString(); const serialized=JSON.stringify(body); let sig=''; if(config.secretKey) sig=createSignature(config.merchantId??config.partnerId??'MCH', body.orderId as string??body.merchantTranId as string??'order-1', (body.amount as number)??0, config.secretKey); const headers:Record<string,string>={'Content-Type':'application/json',Accept:'*/*','X-TIMESTAMP':ts,'X-SIGNATURE':sig,'X-PARTNER-ID':config.partnerId??config.merchantId??'test'}; const res=await doFetch(`${baseUrl}${path}`,{method,headers,body:serialized}); const raw=await res.text(); let data:any; try{data=JSON.parse(raw);}catch{throw new Error(`iPaymu request failed: ${res.status} ${raw}`);} if(!res.ok) throw new Error(`iPaymu request failed: ${res.status} ${raw}`); if(data.responseCode && !String(data.responseCode).startsWith('200') && String(data.responseCode)!=='00') throw new Error(`iPaymu request failed: ${res.status} ${data.responseMessage??raw}`); return data; }
  return {
    id:'ipaymu', name:'iPaymu', priority:config.priority,
    paymentMethods:['virtual_account','qris','ewallet','credit_card'] as PaymentProvider['paymentMethods'],
    capabilities:{ paymentLink:true, recurring:false, refund:false, virtualAccount:true, qris:true, ewallet:true },
    getApiEndpoint:()=>baseUrl,
    async createPaymentLink(data: CreatePaymentLinkInput):Promise<PaymentLinkResult>{
      const body:Record<string,unknown>={ orderId:data.orderId, merchantId:config.merchantId??config.partnerId??'MCH', amount:data.amount, currency:data.currency||'IDR', customerEmail:data.customerEmail, description:data.description, callbackUrl:data.callbackUrl, returnUrl:data.returnUrl };
      if(config.secretKey) body.signature=createSignature(String(body.merchantId), String(body.orderId), Number(body.amount), config.secretKey);
      const result=await req('/api/v2/payment', body);
      return { providerTransactionId:String(result.payment_id??result.trxId??result.transactionId??result.id??data.orderId), paymentUrl:String(result.paymentUrl??result.payment_url??result.redirectUrl??result.checkoutUrl??'' )||undefined, vaNumber:String(result.vaNumber??result.va_number??'' )||undefined, amount:data.amount, currency:data.currency||'IDR', status:'active', raw:result };
    },
    async checkStatus(id:string):Promise<StatusResult>{ const d=await req('/api/v2/payment/status',{orderId:id}); return { providerTransactionId:String(d.payment_id??d.trxId??id), status:mapStatus(d.status??d.paymentStatus??d.responseCode), amount:Number(d.amount??0), currency:'IDR', raw:d }; },
    async verifyWebhook(data:WebhookData):Promise<boolean>{ const sig=data.headers['x-signature']??data.headers['X-Signature']??data.headers['X-SIGNATURE']; if(!sig || !config.secretKey) return false; try{const p2=JSON.parse(data.body); return verifySignature(String(p2.merchantId??config.merchantId??''), String(p2.orderId??''), Number(p2.amount??0), sig, config.secretKey);}catch{return false;} },
    async normalizeWebhook(data:WebhookData):Promise<NormalizedWebhookEvent[]>{ try{const p2=JSON.parse(data.body) as Record<string,unknown>; const s=mapStatus(p2.status??p2.paymentStatus); return [{name:eventFor(s), payload:p2 as Record<string,unknown>, providerEventId:String(p2.orderId??p2.id??'') }]; }catch{return [];} },
  };
}
