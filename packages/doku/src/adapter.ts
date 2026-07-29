import type { CreatePaymentLinkInput, NormalizedWebhookEvent, PaymentLinkResult, PaymentProvider, StatusResult, WebhookData } from '@betterpay/core';
import { createDokuSymmetricSignature, createDokuTransactionSignature, verifyDokuWebhook } from './signature';
import { DokuTokenClient } from './token';

export interface DokuConfig {
  clientId: string;
  privateKey: string;
  clientSecret?: string;
  publicKey?: string;
  isSandbox?: boolean;
  priority?: number;
  partnerServiceId?: string;
  channelId?: string;
  vaBank?: 'BCA';
  tokenSkewSeconds?: number;
  signatureMode?: 'asymmetric' | 'symmetric';
  fetch?: typeof globalThis.fetch;
}

const createPath = '/virtual-accounts/bi-snap-va/v1/transfer-va/create-va';
const statusPath = '/virtual-accounts/bi-snap-va/v1/transfer-va/status';

type DokuResponse = { responseCode?: string; responseMessage?: string; virtualAccountData?: Record<string, unknown>; [key: string]: unknown };
type DokuStatus = DokuResponse & { transactionStatus?: string; status?: string };
type CanonicalStatus = StatusResult['status'];

function statusOf(value: unknown): CanonicalStatus {
  const status = String(value ?? '').toUpperCase();
  if (['PAID', 'SUCCESS', 'COMPLETED', 'SETTLED', '00'].includes(status)) return 'completed';
  if (['EXPIRED', 'EXPIRE'].includes(status)) return 'expired';
  if (['FAILED', 'FAIL'].includes(status)) return 'failed';
  if (['CANCELLED', 'CANCELED', '02'].includes(status)) return 'canceled';
  return 'pending';
}
function eventFor(status: CanonicalStatus): string {
  return status === 'completed' ? 'payment.completed' : status === 'expired' ? 'payment.expired' : status === 'failed' ? 'payment.failed' : status === 'canceled' ? 'payment.canceled' : 'payment.pending';
}
function numericId(): string { return `${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`; }
function errorText(prefix: string, response: Response, raw: string): Error { return new Error(`${prefix}: ${response.status} ${raw}`); }

export function dokuProvider(config: DokuConfig): PaymentProvider & { priority?: number } {
  const baseUrl = config.isSandbox === false ? 'https://api.doku.com' : 'https://api-sandbox.doku.com';
  const requestFetch = config.fetch ?? fetch;
  const tokenClient = new DokuTokenClient({ clientId: config.clientId, privateKey: config.privateKey, baseUrl, fetch: requestFetch, tokenSkewSeconds: config.tokenSkewSeconds });

  async function request(path: string, body: Record<string, unknown>, method = 'POST'): Promise<DokuResponse> {
    const token = await tokenClient.getAccessToken();
    const timestamp = new Date().toISOString();
    const serialized = JSON.stringify(body);
    const signature = config.signatureMode === 'symmetric'
      ? createDokuSymmetricSignature(method, path, serialized, token, timestamp, config.clientSecret ?? '')
      : createDokuTransactionSignature(method, path, serialized, token, timestamp, config.privateKey);
    const response = await requestFetch(`${baseUrl}${path}`, { method, headers: {
      Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: '*/*',
      'X-TIMESTAMP': timestamp, 'X-SIGNATURE': signature, 'X-PARTNER-ID': config.partnerServiceId ?? config.clientId,
      'X-EXTERNAL-ID': numericId(), 'CHANNEL-ID': config.channelId ?? 'H2H',
    }, body: serialized });
    const raw = await response.text();
    let data: DokuResponse;
    try { data = JSON.parse(raw) as DokuResponse; } catch { throw errorText('DOKU request failed', response, raw); }
    if (!response.ok || (data.responseCode && !data.responseCode.startsWith('200'))) throw errorText('DOKU request failed', response, data.responseMessage ?? raw);
    return data;
  }

  return {
    id: 'doku', name: 'DOKU', priority: config.priority,
    paymentMethods: ['virtual_account'],
    capabilities: { paymentLink: true, recurring: false, refund: false, virtualAccount: true },
    getApiEndpoint: () => baseUrl,
    async createPaymentLink(data: CreatePaymentLinkInput): Promise<PaymentLinkResult> {
      const partnerServiceId = config.partnerServiceId ?? config.clientId;
      const customerNo = data.metadata?.customerNo ?? data.orderId.replace(/\D/g, '').slice(-20).padStart(1, '0');
      const virtualAccountNo = `${partnerServiceId.replace(/\s/g, '').padStart(8, '0')}${customerNo}`;
      const body: Record<string, unknown> = {
        partnerServiceId: partnerServiceId.padStart(8, ' '), customerNo, virtualAccountNo,
        virtualAccountName: (data.customerName ?? 'Customer').slice(0, 255), virtualAccountEmail: data.customerEmail,
        virtualAccountPhone: data.customerPhone, trxId: data.orderId,
        totalAmount: { value: data.amount.toFixed(2), currency: data.currency || 'IDR' },
        additionalInfo: { channel: `VIRTUAL_ACCOUNT_${config.vaBank ?? 'BCA'}` }, virtualAccountTrxType: 'C',
        expiredDate: data.expiryMinutes ? new Date(Date.now() + data.expiryMinutes * 60_000).toISOString() : undefined,
      };
      const result = await request(createPath, body);
      const va = result.virtualAccountData ?? {};
      return { providerTransactionId: String(va.trxId ?? data.orderId), vaNumber: String(va.virtualAccountNo ?? virtualAccountNo).trim(), vaBank: config.vaBank ?? 'BCA', amount: data.amount, currency: data.currency || 'IDR', expiresAt: typeof va.expiredDate === 'string' ? va.expiredDate : undefined, status: 'active', raw: result };
    },
    async checkStatus(providerTransactionId: string): Promise<StatusResult> {
      const result = await request(statusPath, { partnerServiceId: config.partnerServiceId ?? config.clientId, trxId: providerTransactionId });
      const raw = result as DokuStatus;
      const va = raw.virtualAccountData ?? {};
      return { providerTransactionId, status: statusOf(raw.transactionStatus ?? raw.status ?? va.status), amount: Number((va.totalAmount as { value?: string } | undefined)?.value ?? 0), currency: String((va.totalAmount as { currency?: string } | undefined)?.currency ?? 'IDR'), raw: result };
    },
    async verifyWebhook(data: WebhookData): Promise<boolean> { return config.publicKey ? verifyDokuWebhook(data.body, data.headers, config.publicKey) : false; },
    async normalizeWebhook(data: WebhookData): Promise<NormalizedWebhookEvent[]> {
      try { const payload = JSON.parse(data.body) as Record<string, unknown>; const status = statusOf(payload.transactionStatus ?? payload.status ?? payload.paymentStatus ?? payload.event); return [{ name: eventFor(status), payload, providerEventId: String(payload.trxId ?? payload.referenceNo ?? payload.orderId ?? '') }]; } catch { return []; }
    },
  };
}
