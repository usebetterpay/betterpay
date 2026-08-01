import type {
  CreatePaymentLinkInput,
  NormalizedWebhookEvent,
  PaymentLinkResult,
  PaymentProvider,
  StatusResult,
  WebhookData,
} from '@betterpay/core';
import { createEspayAsymmetricSignature, verifyEspayAsymmetricSignature, verifyEspayHashSignatureSync } from './signature';

export interface EspayConfig {
  partnerId: string;
  privateKey?: string;
  publicKey?: string;
  secretKey?: string;
  isSandbox?: boolean;
  priority?: number;
  channelId?: string;
  signatureMode?: 'asymmetric' | 'hash';
  fetch?: typeof globalThis.fetch;
}

const HOST_TO_HOST = '/apimerchant/v1.0/debit/payment-host-to-host';
const VA_CREATE = '/v1.0/transfer-va/create-va';
const VA_STATUS = '/v1.0/transfer-va/status';
const QRIS_CREATE = '/v1.0/qr/qr-mpm-generate';
const QRIS_QUERY = '/v1.0/qr/qr-mpm-query';

type SnapResp = {
  responseCode?: string;
  responseMessage?: string;
  webRedirectUrl?: string;
  qrUrl?: string;
  qrContent?: string | null;
  partnerReferenceNo?: string;
  virtualAccountData?: Record<string, unknown>;
  additionalInfo?: Record<string, unknown>;
  amount?: { value?: string; currency?: string };
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
  // responseCode based
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

export function espayProvider(config: EspayConfig): PaymentProvider & { priority?: number } {
  const baseUrl = config.isSandbox === false ? 'https://api-merchant.espay.id' : 'https://sandbox-api.espay.id';
  const doFetch = config.fetch ?? fetch;

  async function snapRequest(path: string, body: Record<string, unknown>, method = 'POST'): Promise<SnapResp> {
    const ts = new Date().toISOString();
    const serialized = JSON.stringify(body);
    let signature = '';
    if (config.signatureMode === 'hash') {
      if (!config.secretKey) throw new Error('Espay hash signature requires secretKey');
      // hash mode: HMAC hex of minified body
      const { createEspayHashSignature } = await import('./signature.js');
      signature = createEspayHashSignature(serialized, config.secretKey);
    } else {
      if (!config.privateKey) throw new Error('Espay asymmetric signature requires privateKey');
      signature = createEspayAsymmetricSignature(method, path, serialized, ts, config.privateKey);
    }
    const res = await doFetch(`${baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Accept: '*/*',
        'X-TIMESTAMP': ts,
        'X-SIGNATURE': signature,
        'X-PARTNER-ID': config.partnerId,
        'X-EXTERNAL-ID': extId(),
        'CHANNEL-ID': config.channelId ?? 'ESPAY',
      },
      body: serialized,
    });
    const raw = await res.text();
    let data: SnapResp;
    try {
      data = JSON.parse(raw) as SnapResp;
    } catch {
      throw new Error(`Espay request failed: ${res.status} ${raw}`);
    }
    if (!res.ok || (data.responseCode && !String(data.responseCode).startsWith('200'))) {
      throw new Error(`Espay request failed: ${res.status} ${data.responseMessage ?? raw}`);
    }
    return data;
  }

  return {
    id: 'espay',
    name: 'Espay',
    priority: config.priority,
    paymentMethods: ['virtual_account', 'qris', 'ewallet', 'retail', 'credit_card'] as PaymentProvider['paymentMethods'],
    capabilities: { paymentLink: true, recurring: false, refund: false, virtualAccount: true, qris: true, ewallet: true },
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

      // Try Host-to-Host (redirect) as primary for VA; fallback to direct VA
      const trxId = data.orderId;
      try {
        const h2hBody: Record<string, unknown> = {
          partnerReferenceNo: trxId,
          amount: { value: data.amount.toFixed(2), currency: data.currency || 'IDR' },
          urlParam: [{ url: data.returnUrl || 'https://example.com/return', type: 'PAY_RETURN', isDeeplink: 'N' }],
          additionalInfo: {
            channel: data.metadata?.channel ?? 'BRI',
            trxId,
            customerName: data.customerName ?? 'Customer',
          },
          expiredDate: data.expiryMinutes
            ? new Date(Date.now() + data.expiryMinutes * 60_000).toISOString()
            : undefined,
        };
        const result = await snapRequest(HOST_TO_HOST, h2hBody);
        const redirect = (result.webRedirectUrl as string | undefined) ?? '';
        if (redirect) {
          return {
            providerTransactionId: trxId,
            paymentUrl: redirect,
            amount: data.amount,
            currency: data.currency || 'IDR',
            status: 'active',
            raw: result,
          };
        }
      } catch {
        // fallback to VA
      }

      const vaBody: Record<string, unknown> = {
        customerNo: data.metadata?.customerNo ?? (trxId.replace(/\D/g, '').slice(-10).padStart(3, '0') || '00000009'),
        virtualAccountName: (data.customerName ?? 'Customer').slice(0, 255),
        trxId,
        totalAmount: { value: data.amount.toFixed(2), currency: data.currency || 'IDR' },
        virtualAccountTrxType: 'c',
        expiredDate: data.expiryMinutes
          ? new Date(Date.now() + data.expiryMinutes * 60_000).toISOString()
          : new Date(Date.now() + 24 * 60 * 60_000).toISOString(),
        additionalInfo: { channel: data.metadata?.channel ?? 'BRI' },
      };
      const result = await snapRequest(VA_CREATE, vaBody);
      const va = (result.virtualAccountData as Record<string, unknown> | undefined) ?? {};
      return {
        providerTransactionId: String((va.trxId as string | undefined) ?? trxId),
        vaNumber: String((va.virtualAccountNo as string | undefined) ?? '').trim() || undefined,
        vaBank: String((va.additionalInfo as Record<string, unknown> | undefined)?.channel ?? 'BRI'),
        amount: data.amount,
        currency: data.currency || 'IDR',
        status: 'active',
        raw: result,
      };
    },

    async checkStatus(providerTransactionId: string): Promise<StatusResult> {
      try {
        const r = await snapRequest(VA_STATUS, {
          virtualAccountNo: providerTransactionId,
          trxId: providerTransactionId,
          additionalInfo: { contractId: providerTransactionId },
        });
        const va = (r.virtualAccountData as Record<string, unknown> | undefined) ?? r;
        const flag = (va.paymentFlagStatus as string | undefined) ?? (r.paymentFlagStatus as string | undefined);
        const totalAmount = (va.totalAmount as unknown as { value?: string; currency?: string } | undefined) ?? (r.amount as unknown as { value?: string } | undefined);
        return {
          providerTransactionId,
          status: mapStatus(flag ?? r.responseCode ?? '01'),
          amount: Number((totalAmount as { value?: string } | undefined)?.value ?? 0),
          currency: String((totalAmount as { currency?: string } | undefined)?.currency ?? 'IDR'),
          raw: r,
        };
      } catch {
        const q = await snapRequest(QRIS_QUERY, {
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
      const body = data.body;
      const headers = data.headers;
      const signature = headers['x-signature'] ?? headers['X-SIGNATURE'] ?? headers['X-Signature'];
      const timestamp = headers['x-timestamp'] ?? headers['X-TIMESTAMP'] ?? headers['X-Timestamp'];
      if (!signature) return false;
      if (config.signatureMode === 'hash' && config.secretKey) {
        return verifyEspayHashSignatureSync(body, signature, config.secretKey);
      }
      if (!config.publicKey || !timestamp) return false;
      const path = headers['x-callback-path'] ?? headers['X-CALLBACK-PATH'] ?? '/v1.0/transfer-va/payment';
      const candidates = headers['x-callback-path'] ? [path] : ['/v1.0/transfer-va/payment', '/v1.0/qr/qr-mpm-notify'];
      for (const p of candidates) {
        if (verifyEspayAsymmetricSignature('POST', p, body, timestamp, signature, config.publicKey)) return true;
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
