import type {
  CreatePaymentLinkInput,
  NormalizedWebhookEvent,
  PaymentLinkResult,
  PaymentProvider,
  StatusResult,
  WebhookData,
} from '@betterpay/core';
import { createNicepaySignature, verifyNicepaySignature } from './signature';

export interface NicepayConfig {
  partnerId: string;
  privateKey: string;
  publicKey?: string;
  isSandbox?: boolean;
  isStaging?: boolean;
  priority?: number;
  channelId?: string;
  fetch?: typeof globalThis.fetch;
}

const VA_CREATE = '/nicepay/api/v1.0/transfer-va/create-va';
const VA_STATUS = '/nicepay/api/v1.0/transfer-va/inquiry';
const QRIS_CREATE = '/nicepay/api/v1.0/qr/qr-mpm-generate';
const QRIS_STATUS = '/nicepay/api/v1.0/qr/qr-mpm-query';

type SnapResp = {
  responseCode?: string;
  responseMessage?: string;
  virtualAccountData?: Record<string, unknown>;
  qrUrl?: string;
  qrContent?: string | null;
  partnerReferenceNo?: string;
  trxId?: string;
  virtualAccountNo?: string;
  amount?: { value?: string; currency?: string };
  totalAmount?: { value?: string; currency?: string };
  additionalInfo?: Record<string, unknown>;
  latestTransactionStatus?: string;
  paymentFlagStatus?: string;
  [k: string]: unknown;
};

function mapStatus(v: unknown): StatusResult['status'] {
  const s = String(v ?? '');
  if (s === '00' || s.toUpperCase() === 'SUCCESS' || s.toUpperCase() === 'PAID' || s.toUpperCase() === 'COMPLETED') return 'completed';
  if (s === '04' || s.toUpperCase() === 'FAILED' || s.toUpperCase() === 'FAIL') return 'failed';
  if (s === '05' || s.toUpperCase() === 'CANCELED' || s.toUpperCase() === 'CANCELLED') return 'canceled';
  if (s === '07' || s.toUpperCase() === 'EXPIRED') return 'expired';
  if (s === '01' || s === '02' || s === '03') return 'pending';
  if (String(s).startsWith('200')) return 'completed';
  return 'pending';
}

function eventFor(s: StatusResult['status']): string {
  if (s === 'completed') return 'payment.completed';
  if (s === 'expired') return 'payment.expired';
  if (s === 'failed') return 'payment.failed';
  if (s === 'canceled') return 'payment.canceled';
  return 'payment.pending';
}

function extId(): string {
  return `${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
}

function isQris(input: CreatePaymentLinkInput): boolean {
  const m = String(input.paymentMethod ?? '').toLowerCase();
  return m === 'qris' || m === 'qr' || m === 'qris_mpm';
}

function resolveBaseUrl(isSandbox?: boolean, isStaging?: boolean): string {
  if (isStaging) return 'https://staging.nicepay.co.id';
  if (isSandbox === false) return 'https://www.nicepay.co.id';
  return 'https://dev.nicepay.co.id';
}

export function nicepayProvider(config: NicepayConfig): PaymentProvider & { priority?: number } {
  const baseUrl = resolveBaseUrl(config.isSandbox, config.isStaging);
  const doFetch = config.fetch ?? fetch;

  async function snapRequest(path: string, body: Record<string, unknown>, method = 'POST'): Promise<SnapResp> {
    const ts = new Date().toISOString();
    const serialized = JSON.stringify(body);
    const signature = createNicepaySignature(method, path, serialized, ts, config.privateKey);
    const res = await doFetch(`${baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Accept: '*/*',
        'X-TIMESTAMP': ts,
        'X-SIGNATURE': signature,
        'X-PARTNER-ID': config.partnerId,
        'X-EXTERNAL-ID': extId(),
        'CHANNEL-ID': config.channelId ?? 'WEB',
      },
      body: serialized,
    });
    const raw = await res.text();
    let data: SnapResp;
    try {
      data = JSON.parse(raw) as SnapResp;
    } catch {
      throw new Error(`Nicepay request failed: ${res.status} ${raw}`);
    }
    if (!res.ok || (data.responseCode && !String(data.responseCode).startsWith('200'))) {
      throw new Error(`Nicepay request failed: ${res.status} ${data.responseMessage ?? raw}`);
    }
    return data;
  }

  return {
    id: 'nicepay',
    name: 'Nicepay',
    priority: config.priority,
    paymentMethods: ['virtual_account', 'qris', 'credit_card', 'retail'] as PaymentProvider['paymentMethods'],
    capabilities: { paymentLink: true, recurring: false, refund: false, virtualAccount: true, qris: true, creditCard: true, retail: true },
    getApiEndpoint: () => baseUrl,

    async createPaymentLink(data: CreatePaymentLinkInput): Promise<PaymentLinkResult> {
      if (isQris(data)) {
        const body: Record<string, unknown> = {
          partnerReferenceNo: data.orderId,
          amount: { value: data.amount.toFixed(2), currency: data.currency || 'IDR' },
          validityPeriod: data.expiryMinutes
            ? new Date(Date.now() + data.expiryMinutes * 60_000).toISOString()
            : new Date(Date.now() + 24 * 60 * 60_000).toISOString(),
          additionalInfo: { isStatic: false },
        };
        const result = await snapRequest(QRIS_CREATE, body);
        const qrUrl = (result.qrUrl as string | undefined) ?? (result.qrContent as string | undefined) ?? '';
        return {
          providerTransactionId: String(result.partnerReferenceNo ?? data.orderId),
          paymentUrl: qrUrl || undefined,
          qrString: (result.qrContent as string | undefined) ?? qrUrl ?? undefined,
          amount: data.amount,
          currency: data.currency || 'IDR',
          status: 'active',
          raw: result,
        };
      }

      const now = new Date();
      const vacctValidDt = now.toISOString().slice(0, 10).replace(/-/g, '');
      const vacctValidTm = now.toTimeString().slice(0, 8).replace(/:/g, '');
      const body: Record<string, unknown> = {
        partnerServiceId: data.metadata?.partnerServiceId ?? '',
        customerNo: data.metadata?.customerNo ?? '',
        virtualAccountNo: data.metadata?.virtualAccountNo ?? '',
        virtualAccountName: (data.customerName ?? 'Customer').slice(0, 255),
        trxId: data.orderId,
        totalAmount: { value: data.amount.toFixed(2), currency: data.currency || 'IDR' },
        additionalInfo: {
          bankCd: data.metadata?.bankCd ?? 'BMRI',
          goodsNm: (data.customerName ?? 'Customer').slice(0, 50),
          dbProcessUrl: data.callbackUrl || 'https://example.com/callback',
          vacctValidDt,
          vacctValidTm,
          msId: data.metadata?.msId ?? '',
          msFee: data.metadata?.msFee ?? '',
          msFeeType: data.metadata?.msFeeType ?? '',
          mbFee: data.metadata?.mbFee ?? '',
          mbFeeType: data.metadata?.mbFeeType ?? '',
        },
      };
      const result = await snapRequest(VA_CREATE, body);
      const va = (result.virtualAccountData as Record<string, unknown> | undefined) ?? {};
      const vaNumber = String((va.virtualAccountNo as string | undefined) ?? (result.virtualAccountNo as string | undefined) ?? '').trim();
      return {
        providerTransactionId: String((va.trxId as string | undefined) ?? (result.trxId as string | undefined) ?? data.orderId),
        vaNumber: vaNumber || undefined,
        vaBank: String((va.additionalInfo as Record<string, unknown> | undefined)?.bankCd ?? data.metadata?.bankCd ?? 'BMRI'),
        amount: data.amount,
        currency: data.currency || 'IDR',
        status: 'active',
        raw: result,
      };
    },

    async checkStatus(providerTransactionId: string): Promise<StatusResult> {
      // Try VA inquiry first
      try {
        const r = await snapRequest(VA_STATUS, {
          trxId: providerTransactionId,
          additionalInfo: { bankCd: 'BMRI' },
        });
        const va = (r.virtualAccountData as Record<string, unknown> | undefined) ?? r;
        const flag = (va.paymentFlagStatus as string | undefined) ?? (r.paymentFlagStatus as string | undefined) ?? r.responseCode;
        const totalAmount = (va.totalAmount as { value?: string; currency?: string } | undefined) ?? (r.totalAmount as { value?: string; currency?: string } | undefined);
        return {
          providerTransactionId,
          status: mapStatus(flag ?? r.responseCode),
          amount: Number(totalAmount?.value ?? 0),
          currency: String(totalAmount?.currency ?? 'IDR'),
          raw: r,
        };
      } catch {
        const q = await snapRequest(QRIS_STATUS, {
          originalPartnerReferenceNo: providerTransactionId,
          serviceCode: '47',
          additionalInfo: { contractId: providerTransactionId },
        });
        return {
          providerTransactionId,
          status: mapStatus(q.latestTransactionStatus ?? q.responseCode),
          amount: Number((q.amount as { value?: string } | undefined)?.value ?? 0),
          currency: String((q.amount as { currency?: string } | undefined)?.currency ?? 'IDR'),
          raw: q,
        };
      }
    },

    async verifyWebhook(data: WebhookData): Promise<boolean> {
      if (!config.publicKey) return false;
      const body = data.body;
      const headers = data.headers;
      const signature = headers['x-signature'] ?? headers['X-SIGNATURE'] ?? headers['X-Signature'];
      const timestamp = headers['x-timestamp'] ?? headers['X-TIMESTAMP'] ?? headers['X-Timestamp'];
      if (!signature || !timestamp) return false;
      const path = headers['x-callback-path'] ?? headers['X-CALLBACK-PATH'] ?? '/nicepay/api/v1.0/transfer-va/payment';
      const candidates = headers['x-callback-path'] ? [path] : ['/nicepay/api/v1.0/transfer-va/payment', '/nicepay/api/v1.0/qr/qr-mpm-notify'];
      for (const p of candidates) {
        if (verifyNicepaySignature('POST', p, body, timestamp, signature, config.publicKey)) return true;
      }
      return false;
    },

    async normalizeWebhook(data: WebhookData): Promise<NormalizedWebhookEvent[]> {
      try {
        const payload = JSON.parse(data.body) as Record<string, unknown>;
        const raw = payload.latestTransactionStatus ?? payload.paymentFlagStatus ?? payload.status ?? payload.paymentStatus ?? payload.transactionStatus;
        const status = mapStatus(raw);
        const id = String(payload.originalPartnerReferenceNo ?? payload.originalReferenceNo ?? payload.trxId ?? payload.partnerReferenceNo ?? '');
        return [{ name: eventFor(status), payload, providerEventId: id }];
      } catch {
        return [];
      }
    },
  };
}
