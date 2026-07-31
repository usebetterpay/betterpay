import type {
  CreatePaymentLinkInput,
  NormalizedWebhookEvent,
  PaymentLinkResult,
  PaymentProvider,
  StatusResult,
  WebhookData,
} from '@betterpay/core';
import { createWinpaySignature, verifyWinpaySignature } from './signature';

export interface WinpayConfig {
  partnerId: string;
  privateKey: string;
  publicKey?: string;
  isSandbox?: boolean;
  priority?: number;
  channelId?: string;
  fetch?: typeof globalThis.fetch;
}

// SNAP paths
const VA_CREATE = '/v1.0/transfer-va/create-va';
const VA_STATUS = '/v1.0/transfer-va/status';
const VA_DELETE = '/v1.0/transfer-va/delete-va';
const QRIS_CREATE = '/v1.0/qr/qr-mpm-generate';
const QRIS_QUERY = '/v1.0/qr/qr-mpm-query';
const QRIS_CANCEL = '/v1.0/qr/qr-mpm-cancel';

type SnapResponse = {
  responseCode?: string;
  responseMessage?: string;
  virtualAccountData?: Record<string, unknown>;
  qrUrl?: string;
  qrContent?: string | null;
  partnerReferenceNo?: string;
  additionalInfo?: Record<string, unknown>;
  amount?: { value?: string; currency?: string };
  feeAmount?: { value?: string; currency?: string };
  latestTransactionStatus?: string;
  paymentFlagStatus?: string;
  [key: string]: unknown;
};

type Canonical = StatusResult['status'];

function mapFlagStatus(value: unknown): Canonical {
  const s = String(value ?? '').toUpperCase();
  // VA status flag: 00 paid/success, 01 unpaid/pending, 02 check
  if (s === '00' || s === 'SUCCESS' || s === 'COMPLETED' || s === 'PAID') return 'completed';
  if (s === 'EXPIRED' || s === '07' || s === '06') return 'expired';
  if (s === 'FAILED' || s === 'FAIL' || s === '06') return 'failed';
  if (s === 'CANCELED' || s === 'CANCELLED' || s === '05' || s === '02') return 'canceled';
  // QRIS latestTransactionStatus codes
  if (s === '00') return 'completed';
  if (s === '03') return 'pending';
  if (s === '04') return 'failed';
  if (s === '05') return 'canceled';
  if (s === '01' || s === '02' || s === '03') return 'pending';
  return 'pending';
}

function mapLatestStatus(value: unknown): Canonical {
  const s = String(value ?? '');
  if (s === '00') return 'completed';
  if (s === '01') return 'pending';
  if (s === '02') return 'pending';
  if (s === '03') return 'pending';
  if (s === '04') return 'failed';
  if (s === '05') return 'canceled';
  if (s === '06') return 'failed';
  if (s === '07') return 'expired';
  // also support named
  return mapFlagStatus(value);
}

function eventFor(status: Canonical): string {
  if (status === 'completed') return 'payment.completed';
  if (status === 'expired') return 'payment.expired';
  if (status === 'failed') return 'payment.failed';
  if (status === 'canceled') return 'payment.canceled';
  return 'payment.pending';
}

function numericExternalId(): string {
  return `${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
}

function isQris(input: CreatePaymentLinkInput): boolean {
  const m = String(input.paymentMethod ?? '').toLowerCase();
  return m === 'qris' || m === 'qr' || m === 'qris_mpm';
}

export function winpayProvider(config: WinpayConfig): PaymentProvider & { priority?: number } {
  const baseUrl = config.isSandbox === false ? 'https://snap.winpay.id' : 'https://sandbox-snap.winpay.id';
  const doFetch = config.fetch ?? fetch;

  async function snapRequest(path: string, body: Record<string, unknown>, method = 'POST'): Promise<SnapResponse> {
    const timestamp = new Date().toISOString();
    const serialized = JSON.stringify(body);
    const signature = createWinpaySignature(method, path, serialized, timestamp, config.privateKey);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: '*/*',
      'X-TIMESTAMP': timestamp,
      'X-SIGNATURE': signature,
      'X-PARTNER-ID': config.partnerId,
      'X-EXTERNAL-ID': numericExternalId(),
      'CHANNEL-ID': config.channelId ?? 'WEB',
    };
    const res = await doFetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: method === 'DELETE' ? serialized : serialized,
    });
    const raw = await res.text();
    let data: SnapResponse;
    try {
      data = JSON.parse(raw) as SnapResponse;
    } catch {
      throw new Error(`Winpay request failed: ${res.status} ${raw}`);
    }
    if (!res.ok || (data.responseCode && !String(data.responseCode).startsWith('200'))) {
      throw new Error(`Winpay request failed: ${res.status} ${data.responseMessage ?? raw}`);
    }
    return data;
  }

  return {
    id: 'winpay',
    name: 'Winpay',
    priority: config.priority,
    paymentMethods: ['virtual_account', 'qris', 'ewallet', 'retail', 'credit_card'] as const as PaymentProvider['paymentMethods'],
    capabilities: {
      paymentLink: true,
      recurring: false,
      refund: false,
      virtualAccount: true,
      qris: true,
      ewallet: true,
      retail: true,
      creditCard: true,
    },
    getApiEndpoint: () => baseUrl,

    async createPaymentLink(data: CreatePaymentLinkInput): Promise<PaymentLinkResult> {
      if (isQris(data)) {
        const partnerReferenceNo = data.orderId;
        const body: Record<string, unknown> = {
          partnerReferenceNo,
          amount: { value: data.amount.toFixed(2), currency: data.currency || 'IDR' },
          validityPeriod: data.expiryMinutes
            ? new Date(Date.now() + data.expiryMinutes * 60_000).toISOString()
            : new Date(Date.now() + 24 * 60 * 60_000).toISOString(),
          additionalInfo: { isStatic: false },
        };
        const result = await snapRequest(QRIS_CREATE, body);
        const qrUrl = (result.qrUrl as string | undefined) ?? (result.qrContent as string | undefined) ?? '';
        const contractId = (result.additionalInfo as Record<string, unknown> | undefined)?.contractId;
        return {
          providerTransactionId: String(result.partnerReferenceNo ?? partnerReferenceNo),
          paymentUrl: qrUrl || undefined,
          qrString: (result.qrContent as string | undefined) ?? qrUrl ?? undefined,
          amount: data.amount,
          currency: data.currency || 'IDR',
          expiresAt: (result.additionalInfo as Record<string, unknown> | undefined)?.expiredAt as string | undefined,
          status: 'active',
          raw: { ...result, contractId },
        };
      }

      // VA default (One Off)
      const trxId = data.orderId;
      const fallbackNo = trxId.replace(/\D/g, '').slice(-10).padStart(3, '0') || '00000009';
      const customerNo = data.metadata?.customerNo ?? fallbackNo;
      const body: Record<string, unknown> = {
        customerNo,
        virtualAccountName: (data.customerName ?? 'Customer').slice(0, 255),
        trxId,
        totalAmount: { value: data.amount.toFixed(2), currency: data.currency || 'IDR' },
        virtualAccountTrxType: 'c',
        expiredDate: data.expiryMinutes
          ? new Date(Date.now() + data.expiryMinutes * 60_000).toISOString()
          : new Date(Date.now() + 24 * 60 * 60_000).toISOString(),
        additionalInfo: {
          channel: data.metadata?.channel ?? 'BRI',
        },
      };
      const result = await snapRequest(VA_CREATE, body);
      const va = (result.virtualAccountData as Record<string, unknown> | undefined) ?? {};
      return {
        providerTransactionId: String((va.trxId as string | undefined) ?? trxId),
        vaNumber: String((va.virtualAccountNo as string | undefined) ?? '').trim() || undefined,
        vaBank: String((va.additionalInfo as Record<string, unknown> | undefined)?.channel ?? data.metadata?.channel ?? 'BRI'),
        amount: data.amount,
        currency: data.currency || 'IDR',
        expiresAt: (va.expiredDate as string | undefined) ?? undefined,
        status: 'active',
        raw: result,
      };
    },

    async checkStatus(providerTransactionId: string): Promise<StatusResult> {
      // Try QRIS query first if looks like QRIS; fallback to VA status. We try QRIS query with serviceCode 47
      // For generic check, attempt VA status endpoint; if 404 try QRIS query.
      try {
        const vaResult = await snapRequest(
          VA_STATUS,
          {
            virtualAccountNo: providerTransactionId,
            trxId: providerTransactionId,
            additionalInfo: { contractId: providerTransactionId },
          },
          'POST',
        );
        const va = (vaResult.virtualAccountData as Record<string, unknown> | undefined) ?? vaResult;
        const flag = (va.paymentFlagStatus as string | undefined) ?? vaResult.paymentFlagStatus ?? vaResult.responseCode;
        const status = mapFlagStatus(flag);
        const totalAmount = (va.totalAmount as { value?: string; currency?: string } | undefined) ?? (vaResult.amount as unknown as { value?: string; currency?: string } | undefined);
        return {
          providerTransactionId,
          status,
          amount: Number((totalAmount as { value?: string } | undefined)?.value ?? 0),
          currency: String((totalAmount as { currency?: string } | undefined)?.currency ?? 'IDR'),
          raw: vaResult,
        };
      } catch {
        // Fallback to QRIS query
        const qrisResult = await snapRequest(QRIS_QUERY, {
          originalPartnerReferenceNo: providerTransactionId,
          serviceCode: '47',
          additionalInfo: { contractId: providerTransactionId },
        });
        return {
          providerTransactionId,
          status: mapLatestStatus(qrisResult.latestTransactionStatus),
          amount: Number((qrisResult.amount as { value?: string } | undefined)?.value ?? 0),
          currency: String((qrisResult.amount as { currency?: string } | undefined)?.currency ?? 'IDR'),
          raw: qrisResult,
        };
      }
    },

    async cancelTransaction(providerTransactionId: string): Promise<void> {
      // Attempt QRIS cancel first, then VA delete
      try {
        await snapRequest(QRIS_CANCEL, {
          originalPartnerReferenceNo: providerTransactionId,
          reason: 'Canceled by merchant',
          additionalInfo: { contractId: providerTransactionId },
        });
        return;
      } catch {}
      await snapRequest(
        VA_DELETE,
        {
          virtualAccountNo: providerTransactionId,
          trxId: providerTransactionId,
          additionalInfo: { contractId: providerTransactionId, channel: 'BRI' },
        },
        'DELETE',
      );
    },

    async verifyWebhook(data: WebhookData): Promise<boolean> {
      if (!config.publicKey) return false;
      const body = data.body;
      const headers = data.headers;
      const signature = headers['x-signature'] ?? headers['X-SIGNATURE'] ?? headers['X-Signature'];
      const timestamp = headers['x-timestamp'] ?? headers['X-TIMESTAMP'] ?? headers['X-Timestamp'];
      if (!signature || !timestamp) return false;
      // Try common callback paths; verify against each. Use path from header if provided.
      const callbackPath =
        headers['x-callback-path'] ??
        headers['X-CALLBACK-PATH'] ??
        headers['x-path'] ??
        headers['X-PATH'];
      const candidates = callbackPath
        ? [callbackPath]
        : ['/v1.0/transfer-va/payment', '/v1.0/qr/qr-mpm-notify', '/v1/test', '/sandbox_prod/url_listener.php/v1.0/transfer-va/payment'];
      for (const p of candidates) {
        if (verifyWinpaySignature('POST', p, body, timestamp, signature, config.publicKey)) return true;
      }
      return false;
    },

    async normalizeWebhook(data: WebhookData): Promise<NormalizedWebhookEvent[]> {
      try {
        const payload = JSON.parse(data.body) as Record<string, unknown>;
        const statusRaw =
          payload.latestTransactionStatus ??
          payload.paymentFlagStatus ??
          payload.transactionStatus ??
          payload.status ??
          payload.paymentStatus;
        const status = mapLatestStatus(statusRaw);
        const id = String(
          payload.originalPartnerReferenceNo ??
            payload.originalReferenceNo ??
            payload.trxId ??
            payload.partnerReferenceNo ??
            payload.referenceNo ??
            '',
        );
        return [{ name: eventFor(status), payload, providerEventId: id }];
      } catch {
        return [];
      }
    },
  };
}
