import type {
  CreatePaymentLinkInput,
  NormalizedWebhookEvent,
  PaymentLinkResult,
  PaymentProvider,
  StatusResult,
  WebhookData,
} from '@betterpay/core';
import { createFaspayHashSignature, createFaspaySnapSignature, verifyFaspayWebhook } from './signature';

export interface FaspayConfig {
  merchantId: string;
  secretKey?: string;
  privateKey?: string;
  publicKey?: string;
  isSandbox?: boolean;
  priority?: number;
  signatureMode?: 'hash' | 'snap';
  fetch?: typeof globalThis.fetch;
}

type FaspayResp = {
  response_code?: string;
  response_desc?: string;
  responseCode?: string;
  responseMessage?: string;
  payment_url?: string;
  paymentUrl?: string;
  redirect_url?: string;
  trx_id?: string;
  trxId?: string;
  amount?: string | number;
  status?: string;
  transaction_status?: string;
  [k: string]: unknown;
};

function mapStatus(v: unknown): StatusResult['status'] {
  const s = String(v ?? '').toUpperCase();
  if (['SUCCESS', 'PAID', 'COMPLETED', '00', 'CAPTURE', 'SETTLEMENT'].includes(s)) return 'completed';
  if (['FAILED', 'FAIL', '01', 'DENY', 'FAILURE'].includes(s)) return 'failed';
  if (['CANCELED', 'CANCELLED', '02'].includes(s)) return 'canceled';
  if (['EXPIRED', 'EXPIRE'].includes(s)) return 'expired';
  if (['PENDING', 'UNPAID'].includes(s)) return 'pending';
  return 'pending';
}

function eventFor(s: StatusResult['status']): string {
  if (s === 'completed') return 'payment.completed';
  if (s === 'expired') return 'payment.expired';
  if (s === 'failed') return 'payment.failed';
  if (s === 'canceled') return 'payment.canceled';
  return 'payment.pending';
}

export function faspayProvider(config: FaspayConfig): PaymentProvider & { priority?: number } {
  const baseUrl = config.isSandbox === false ? 'https://fpg.faspay.co.id' : 'https://fpg-sandbox.faspay.co.id';
  const doFetch = config.fetch ?? fetch;

  async function request(path: string, body: Record<string, unknown>, method = 'POST'): Promise<FaspayResp> {
    const ts = new Date().toISOString();
    const serialized = JSON.stringify(body);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: '*/*',
    };
    if (config.signatureMode === 'snap' && config.privateKey) {
      const sig = createFaspaySnapSignature(method, path, serialized, ts, config.privateKey);
      headers['X-TIMESTAMP'] = ts;
      headers['X-SIGNATURE'] = sig;
      headers['X-PARTNER-ID'] = config.merchantId;
      headers['X-EXTERNAL-ID'] = `${Date.now()}`;
      headers['CHANNEL-ID'] = 'WEB';
    } else if (config.secretKey) {
      // hash mode: not header, but body already contains signature field
    }
    const res = await doFetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: serialized,
    });
    const raw = await res.text();
    let data: FaspayResp;
    try {
      data = JSON.parse(raw) as FaspayResp;
    } catch {
      throw new Error(`Faspay request failed: ${res.status} ${raw}`);
    }
    if (!res.ok) throw new Error(`Faspay request failed: ${res.status} ${data.response_desc ?? data.responseMessage ?? raw}`);
    const code = data.response_code ?? data.responseCode;
    if (code && !['00', '200', '2000000', '2002700'].includes(String(code)) && !String(code).startsWith('200')) {
      // Some Faspay responses use 00 for success; allow 00, otherwise treat non-200 as error only if explicit failure
      if (String(code) !== '00' && !String(code).startsWith('2')) {
        throw new Error(`Faspay request failed: ${res.status} ${data.response_desc ?? data.responseMessage ?? raw}`);
      }
    }
    return data;
  }

  return {
    id: 'faspay',
    name: 'Faspay',
    priority: config.priority,
    paymentMethods: ['virtual_account', 'credit_card', 'qris', 'retail'] as PaymentProvider['paymentMethods'],
    capabilities: { paymentLink: true, recurring: false, refund: false, virtualAccount: true, creditCard: true },
    getApiEndpoint: () => baseUrl,

    async createPaymentLink(data: CreatePaymentLinkInput): Promise<PaymentLinkResult> {
      const merchantTranId = data.orderId;
      const signature =
        config.secretKey !== undefined
          ? createFaspayHashSignature(config.merchantId, merchantTranId, data.amount, config.secretKey)
          : '';
      const body: Record<string, unknown> = {
        merchantId: config.merchantId,
        merchantTranId,
        amount: data.amount,
        currency: data.currency || 'IDR',
        signature,
        callbackUrl: data.callbackUrl,
        returnUrl: data.returnUrl,
        customerName: data.customerName ?? 'Customer',
        customerEmail: data.customerEmail,
        description: data.description,
        expiryMinutes: data.expiryMinutes,
      };
      const result = await request('/payment', body);
      const paymentUrl = String(result.payment_url ?? result.paymentUrl ?? result.redirect_url ?? '');
      return {
        providerTransactionId: String(result.trx_id ?? result.trxId ?? merchantTranId),
        paymentUrl: paymentUrl || undefined,
        amount: data.amount,
        currency: data.currency || 'IDR',
        status: 'active',
        raw: result,
      };
    },

    async checkStatus(providerTransactionId: string): Promise<StatusResult> {
      const body: Record<string, unknown> = {
        merchantId: config.merchantId,
        merchantTranId: providerTransactionId,
      };
      if (config.secretKey) {
        body.signature = createFaspayHashSignature(config.merchantId, providerTransactionId, '', config.secretKey);
      }
      const result = await request('/payment/status', body);
      return {
        providerTransactionId,
        status: mapStatus(result.status ?? result.transaction_status ?? result.response_code ?? result.responseCode),
        amount: Number(result.amount ?? 0),
        currency: 'IDR',
        raw: result,
      };
    },

    async verifyWebhook(data: WebhookData): Promise<boolean> {
      const secret = config.secretKey ?? '';
      return verifyFaspayWebhook(data.body, data.headers, secret, config.publicKey);
    },

    async normalizeWebhook(data: WebhookData): Promise<NormalizedWebhookEvent[]> {
      try {
        const payload = JSON.parse(data.body) as Record<string, unknown>;
        const raw = payload.status ?? payload.transaction_status ?? payload.payment_status ?? payload.response_code ?? payload.responseCode;
        const status = mapStatus(raw);
        const id = String(payload.merchantTranId ?? payload.merchant_tranid ?? payload.trxId ?? payload.trx_id ?? payload.orderId ?? '');
        return [{ name: eventFor(status), payload, providerEventId: id }];
      } catch {
        return [];
      }
    },
  };
}
