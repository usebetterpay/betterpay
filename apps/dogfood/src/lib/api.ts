export type Snapshot = {
  customerId: string;
  customerName: string;
  customerEmail: string;
  planId: string;
  subscriptionId: string;
  subscriptionStatus: string;
  interval: 'month' | 'year';
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string;
  creditsUsed: number;
  bonusCredits: number;
  payments: Array<{
    id: string;
    kind: 'plan' | 'credit_pack';
    planId?: string;
    packId?: string;
    creditsGranted: number;
    amountIdr: number;
    status: 'pending' | 'paid' | 'failed' | 'expired';
    paymentUrl: string;
    createdAt: string;
    paidAt?: string;
    label: string;
  }>;
  invoices: unknown[];
  callout: {
    status: 'pending' | 'success' | 'failed' | 'past_due';
    title?: string;
    description?: string;
  } | null;
  paymentMode: 'simulate' | 'live';
  activity: Array<{ at: string; message: string }>;
  catalog: {
    plans: unknown[];
    packs: Array<{
      id: string;
      name: string;
      credits: number;
      amountIdr: number;
      description: string;
      badge?: string;
    }>;
  };
  credits: {
    planAllowance: number;
    planUsed: number;
    planRemaining: number;
    bonusCredits: number;
    totalRemaining: number;
    poolLimit: number;
    poolUsed: number;
  };
  plan: {
    id: string;
    name: string;
    creditsPerPeriod: number;
    monthlyAmount: number;
  };
  views: {
    subscription: {
      id: string;
      planId: string;
      planName: string;
      status: 'scheduled' | 'active' | 'past_due' | 'canceled' | 'ended';
      interval: 'month' | 'year' | 'custom';
      nextAmount?: number;
      currency?: string;
      currentPeriodEnd?: string | null;
      paymentMethodLabel?: string;
      cancelAtPeriodEnd?: boolean;
    };
    entitlement: {
      featureId: string;
      label: string;
      used: number;
      limit: number | null;
      resetLabel?: string;
      unit?: string;
    };
    entitlements: Array<{
      featureId: string;
      label: string;
      used: number;
      limit: number | null;
      resetLabel?: string;
      unit?: string;
    }>;
    plans: Array<{
      id: string;
      name: string;
      description?: string;
      monthlyAmount: number;
      yearlyAmount: number;
      currency?: string;
      recommended?: boolean;
      badge?: string;
      features: Array<{ id: string; label: string; included?: boolean }>;
      ctaLabel?: string;
    }>;
    invoices: Array<{
      id: string;
      number: string;
      amount: number;
      currency?: string;
      status: 'draft' | 'open' | 'paid' | 'overdue' | 'void';
      issuedAt: string;
      paidAt?: string | null;
    }>;
    callout: {
      status: 'pending' | 'success' | 'failed' | 'past_due';
      title?: string;
      description?: string;
    } | null;
  };
};

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

export const api = {
  state: () => req<Snapshot>('/state'),
  seed: (template: string) =>
    req<Snapshot>('/seed', { method: 'POST', body: JSON.stringify({ template }) }),
  paymentMode: (mode: 'simulate' | 'live') =>
    req<Snapshot>('/payment-mode', { method: 'POST', body: JSON.stringify({ mode }) }),
  burn: (amount: number) =>
    req<Snapshot>('/burn', { method: 'POST', body: JSON.stringify({ amount }) }),
  grant: (amount: number) =>
    req<Snapshot>('/grant', { method: 'POST', body: JSON.stringify({ amount }) }),
  resetPeriod: () => req<Snapshot>('/reset-period', { method: 'POST', body: '{}' }),
  buyPlan: (planId: string, interval: 'month' | 'year' = 'month') =>
    req<{ payment: Snapshot['payments'][0] | null; snapshot: Snapshot }>('/buy-plan', {
      method: 'POST',
      body: JSON.stringify({ planId, interval }),
    }),
  buyPack: (packId: string) =>
    req<{ payment: Snapshot['payments'][0]; snapshot: Snapshot }>('/buy-pack', {
      method: 'POST',
      body: JSON.stringify({ packId }),
    }),
  simulatePayment: (paymentId: string, outcome: 'paid' | 'failed' | 'expired' = 'paid') =>
    req<Snapshot>('/simulate-payment', {
      method: 'POST',
      body: JSON.stringify({ paymentId, outcome }),
    }),
  cancel: (cancelAtPeriodEnd = true) =>
    req<Snapshot>('/cancel', {
      method: 'POST',
      body: JSON.stringify({ cancelAtPeriodEnd }),
    }),
  dismissCallout: () =>
    req<Snapshot>('/dismiss-callout', { method: 'POST', body: '{}' }),
};
