import { SumopodProvider } from '@betterpay/sumopod';
import { midtransProvider } from '@betterpay/midtrans';
import { xenditProvider } from '@betterpay/xendit';
import { TripayProvider } from '@betterpay/tripay';
import type { PaymentProvider } from '@betterpay/core';
import { publicOrigin } from './env.js';

export const PROVIDER_IDS = ['sumopod', 'midtrans', 'xendit', 'tripay'] as const;
export type ProviderId = (typeof PROVIDER_IDS)[number];

export const PROVIDER_LABELS: Record<ProviderId, string> = {
  sumopod: 'SumoPod QRIS',
  midtrans: 'Midtrans',
  xendit: 'Xendit',
  tripay: 'Tripay',
};

const cache: Partial<Record<ProviderId, PaymentProvider>> = {};

export function isProviderId(value: string): value is ProviderId {
  return (PROVIDER_IDS as readonly string[]).includes(value);
}

export function getDefaultProviderId(): ProviderId {
  const raw = (process.env.DEFAULT_PROVIDER ?? 'sumopod').toLowerCase();
  return isProviderId(raw) ? raw : 'sumopod';
}

function envTruthy(value: string | undefined, whenUnset: boolean): boolean {
  if (value == null || value === '') return whenUnset;
  return !['0', 'false', 'no', 'off'].includes(value.toLowerCase());
}

export function providerStatus() {
  const xenditKey =
    process.env.XENDIT_SECRET_KEY?.trim() || process.env.XENDIT_API_KEY?.trim();
  const tripayOk = Boolean(
    process.env.TRIPAY_API_KEY?.trim() &&
      process.env.TRIPAY_PRIVATE_KEY?.trim() &&
      process.env.TRIPAY_MERCHANT_CODE?.trim(),
  );
  const duitkuOk = Boolean(
    process.env.DUITKU_API_KEY?.trim() && process.env.DUITKU_MERCHANT_CODE?.trim(),
  );

  return {
    defaultProvider: getDefaultProviderId(),
    publicOrigin: publicOrigin(),
    sumopod: {
      configured: Boolean(process.env.SUMOPOD_API_KEY?.trim()),
      sandbox: envTruthy(process.env.SUMOPOD_IS_SANDBOX, true),
      webhookAuth: Boolean(
        process.env.SUMOPOD_WEBHOOK_SECRET?.trim() ||
          process.env.SUMOPOD_WEBHOOK_TOKEN?.trim(),
      ),
    },
    midtrans: {
      configured: Boolean(process.env.MIDTRANS_SERVER_KEY?.trim()),
      sandbox: envTruthy(process.env.MIDTRANS_IS_SANDBOX, true),
    },
    xendit: {
      configured: Boolean(xenditKey),
      sandbox: true,
      webhookAuth: Boolean(
        process.env.XENDIT_WEBHOOK_VERIFICATION_TOKEN?.trim() ||
          process.env.XENDIT_WEBHOOK_SECRET?.trim() ||
          process.env.XENDIT_WEBHOOK_TOKEN?.trim(),
      ),
    },
    tripay: {
      configured: tripayOk,
      sandbox: !envTruthy(process.env.TRIPAY_IS_PRODUCTION, false),
    },
    duitku: {
      configured: duitkuOk,
      sandbox: envTruthy(process.env.DUITKU_IS_SANDBOX, true),
    },
  };
}

export function getProvider(id: ProviderId = getDefaultProviderId()): PaymentProvider {
  const cached = cache[id];
  if (cached) return cached;

  if (id === 'midtrans') {
    const serverKey = process.env.MIDTRANS_SERVER_KEY?.trim();
    if (!serverKey) {
      throw new Error('MIDTRANS_SERVER_KEY is not set. Add it to apps/dogfood/.env');
    }
    const provider = midtransProvider({
      serverKey,
      clientKey: process.env.MIDTRANS_CLIENT_KEY,
      isSandbox: envTruthy(process.env.MIDTRANS_IS_SANDBOX, true),
    });
    cache.midtrans = provider;
    return provider;
  }

  if (id === 'xendit') {
    const apiKey =
      process.env.XENDIT_SECRET_KEY?.trim() || process.env.XENDIT_API_KEY?.trim();
    if (!apiKey) {
      throw new Error(
        'XENDIT_SECRET_KEY (or XENDIT_API_KEY) is not set. Add it to apps/dogfood/.env',
      );
    }
    const webhookSecret =
      process.env.XENDIT_WEBHOOK_VERIFICATION_TOKEN?.trim() ||
      process.env.XENDIT_WEBHOOK_SECRET?.trim() ||
      process.env.XENDIT_WEBHOOK_TOKEN?.trim();
    const provider = xenditProvider({
      apiKey,
      webhookSecret: webhookSecret || undefined,
    });
    cache.xendit = provider;
    return provider;
  }

  if (id === 'tripay') {
    const apiKey = process.env.TRIPAY_API_KEY?.trim();
    const privateKey = process.env.TRIPAY_PRIVATE_KEY?.trim();
    const merchantCode = process.env.TRIPAY_MERCHANT_CODE?.trim();
    if (!apiKey || !privateKey || !merchantCode) {
      throw new Error(
        'TRIPAY_API_KEY, TRIPAY_PRIVATE_KEY, and TRIPAY_MERCHANT_CODE are required',
      );
    }
    const provider = new TripayProvider({
      apiKey,
      privateKey,
      merchantCode,
      isSandbox: !envTruthy(process.env.TRIPAY_IS_PRODUCTION, false),
    });
    cache.tripay = provider;
    return provider;
  }

  const apiKey = process.env.SUMOPOD_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('SUMOPOD_API_KEY is not set. Add it to apps/dogfood/.env');
  }
  const provider = new SumopodProvider({
    apiKey,
    isSandbox: envTruthy(process.env.SUMOPOD_IS_SANDBOX, true),
    webhookSecret: process.env.SUMOPOD_WEBHOOK_SECRET?.trim() || undefined,
    webhookToken: process.env.SUMOPOD_WEBHOOK_TOKEN?.trim() || undefined,
  });
  cache.sumopod = provider;
  return provider;
}

/** Default channel for Tripay when createPaymentLink omits paymentMethod. */
export function tripayDefaultMethod(): string {
  return process.env.TRIPAY_DEFAULT_METHOD?.trim() || 'QRIS';
}

export function returnUrls() {
  const origin = publicOrigin();
  return {
    returnUrl: `${origin}/payments`,
    callbackUrl: `${origin}/payments`,
  };
}
