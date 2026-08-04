import type {
  CreatePaymentLinkInput,
  NormalizedWebhookEvent,
  PaymentLinkResult,
  PaymentProvider,
  StatusResult,
  WebhookData,
} from '@betterpay/core';
import { createOyHeaders, verifyOyWebhook } from './signature';

export interface OyConfig {
  username: string;
  apiKey: string;
  isSandbox?: boolean;
  priority?: number;
  allowedIps?: string[];
  fetch?: typeof globalThis.fetch;
}

export interface DisburseInput {
  recipientBank: string;
  recipientAccount: string;
  amount: number;
  note?: string;
  partnerTrxId?: string;
  email?: string;
}

export interface DisburseResult {
  providerTransactionId: string;
  status: 'pending' | 'completed' | 'failed';
  amount: number;
  raw: unknown;
}

type OyResp = {
  status?: { code?: string; message?: string };
  trxId?: string;
  partnerTrxId?: string;
  amount?: number | string;
  recipientBank?: string;
  recipientAccount?: string;
  [k: string]: unknown;
};

function mapDisburseStatus(code: string | undefined, statusStr: string | undefined): DisburseResult['status'] {
  const raw = String(statusStr ?? '').toUpperCase();
  const c = String(code ?? '').toUpperCase();
  // Check both code and message
  const combined = `${c} ${raw}`;
  if (combined.includes('SUCCESS') || c === '000' || c === '00' || raw === 'SUCCESS') return 'completed';
  if (combined.includes('FAIL') || c === '01') return 'failed';
  return 'pending';
}

function mapStatus(v: unknown): StatusResult['status'] {
  const s = String(v ?? '').toUpperCase();
  if (['SUCCESS', 'COMPLETED', '00', '000'].includes(s)) return 'completed';
  if (['FAILED', 'FAIL'].includes(s)) return 'failed';
  if (['CANCELED', 'CANCELLED'].includes(s)) return 'canceled';
  if (['EXPIRED'].includes(s)) return 'expired';
  return 'pending';
}

function eventFor(s: StatusResult['status']): string {
  if (s === 'completed') return 'payout.completed';
  if (s === 'failed') return 'payout.failed';
  if (s === 'canceled') return 'payout.canceled';
  if (s === 'expired') return 'payout.expired';
  return 'payout.pending';
}

export function oyProvider(config: OyConfig): PaymentProvider & {
  priority?: number;
  disburse(data: DisburseInput): Promise<DisburseResult>;
} {
  const baseUrl = config.isSandbox ? 'https://api-stg.oyindonesia.com' : 'https://partner.oyindonesia.com';
  const doFetch = config.fetch ?? fetch;

  async function oyRequest(path: string, body: Record<string, unknown>): Promise<OyResp> {
    const headers = createOyHeaders(config.username, config.apiKey);
    const res = await doFetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    const raw = await res.text();
    let data: OyResp;
    try {
      data = JSON.parse(raw) as OyResp;
    } catch {
      throw new Error(`OY! request failed: ${res.status} ${raw}`);
    }
    if (!res.ok) throw new Error(`OY! request failed: ${res.status} ${data.status?.message ?? raw}`);
    return data;
  }

  const provider: PaymentProvider & { priority?: number; disburse(data: DisburseInput): Promise<DisburseResult> } = {
    id: 'oy',
    name: 'OY! Indonesia',
    priority: config.priority,
    paymentMethods: ['bank_transfer'] as PaymentProvider['paymentMethods'],
    capabilities: {
      paymentLink: false,
      recurring: false,
      refund: false,
      payout: true,
      weakWebhookAuth: true,
    },
    getApiEndpoint: () => baseUrl,

    async createPaymentLink(_data: CreatePaymentLinkInput): Promise<PaymentLinkResult> {
      throw new Error('OY! is a payout provider — use disburse() instead of createPaymentLink()');
    },

    async checkStatus(providerTransactionId: string): Promise<StatusResult> {
      const result = await oyRequest('/api/remit-status', {
        partnerTrxId: providerTransactionId,
        trxId: providerTransactionId,
      });
      const code = (result.status as { code?: string } | undefined)?.code ?? (result as Record<string, unknown>).code;
      const statusStr = (result.status as { message?: string } | undefined)?.message ?? (result as Record<string, unknown>).status;
      return {
        providerTransactionId: String(result.trxId ?? result.partnerTrxId ?? providerTransactionId),
        status: mapStatus(code ?? statusStr),
        amount: Number(result.amount ?? 0),
        currency: 'IDR',
        raw: result,
      };
    },

    async verifyWebhook(data: WebhookData): Promise<boolean> {
      const ip = data.headers['x-forwarded-for'] ?? data.headers['X-Forwarded-For'] ?? data.headers['x-real-ip'] ?? data.headers['X-Real-Ip'];
      // Also check X-OY headers if IP not available
      return verifyOyWebhook(data.headers, ip?.split(',')[0]?.trim(), config.allowedIps);
    },

    async normalizeWebhook(data: WebhookData): Promise<NormalizedWebhookEvent[]> {
      try {
        const payload = JSON.parse(data.body) as Record<string, unknown>;
        const statusRaw = (payload.status as string | undefined) ?? (payload as Record<string, unknown>).status ?? payload.code;
        const status = mapStatus(statusRaw);
        const id = String(payload.trxId ?? payload.partnerTrxId ?? payload.partner_trx_id ?? '');
        return [{ name: eventFor(status), payload, providerEventId: id }];
      } catch {
        return [];
      }
    },

    async disburse(data: DisburseInput): Promise<DisburseResult> {
      const body: Record<string, unknown> = {
        recipientBank: data.recipientBank,
        recipientAccount: data.recipientAccount,
        amount: data.amount,
        note: data.note ?? '',
        partnerTrxId: data.partnerTrxId ?? `oy-${Date.now()}`,
        email: data.email ?? '',
      };
      const result = await oyRequest('/api/remit', body);
      const code = (result.status as { code?: string } | undefined)?.code;
      const msg = (result.status as { message?: string } | undefined)?.message;
      return {
        providerTransactionId: String(result.trxId ?? result.partnerTrxId ?? body.partnerTrxId),
        status: mapDisburseStatus(code, msg),
        amount: data.amount,
        raw: result,
      };
    },
  };

  return provider;
}
