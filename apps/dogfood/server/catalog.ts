/** Product catalog — Acme AI sells monthly plans + one-shot credit packs. */

export type PlanId = 'free' | 'starter' | 'pro';
export type PackId = 'pack_100' | 'pack_500' | 'pack_2000';

export interface PlanDef {
  id: PlanId;
  name: string;
  description: string;
  /** Monthly price IDR (0 = free). */
  monthlyAmount: number;
  yearlyAmount: number;
  /** AI credits included each billing period. */
  creditsPerPeriod: number;
  recommended?: boolean;
  badge?: string;
  features: Array<{ id: string; label: string; included?: boolean }>;
}

export interface PackDef {
  id: PackId;
  name: string;
  credits: number;
  amountIdr: number;
  description: string;
  badge?: string;
}

export const PLANS: PlanDef[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'Try Acme AI with a small monthly allowance.',
    monthlyAmount: 0,
    yearlyAmount: 0,
    creditsPerPeriod: 100,
    features: [
      { id: 'cr', label: '100 AI credits / month' },
      { id: 'models', label: 'Base models', included: true },
      { id: 'priority', label: 'Priority queue', included: false },
    ],
  },
  {
    id: 'starter',
    name: 'Starter',
    description: 'For indie builders shipping AI features.',
    monthlyAmount: 49_000,
    yearlyAmount: 490_000,
    creditsPerPeriod: 1_000,
    badge: 'Popular',
    recommended: true,
    features: [
      { id: 'cr', label: '1.000 AI credits / month' },
      { id: 'models', label: 'Base + chat models', included: true },
      { id: 'priority', label: 'Standard queue', included: true },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'Higher limits for production workloads.',
    monthlyAmount: 199_000,
    yearlyAmount: 1_990_000,
    creditsPerPeriod: 10_000,
    features: [
      { id: 'cr', label: '10.000 AI credits / month' },
      { id: 'models', label: 'All models', included: true },
      { id: 'priority', label: 'Priority queue', included: true },
    ],
  },
];

// Fix free plan typing (cta on PlanView only)
export const PLAN_CTA: Record<PlanId, string> = {
  free: 'Start free',
  starter: 'Upgrade to Starter',
  pro: 'Upgrade to Pro',
};

export const PACKS: PackDef[] = [
  {
    id: 'pack_100',
    name: '+100 credits',
    credits: 100,
    amountIdr: 10_000, // SumoPod sandbox minimum
    description: 'Small top-up when you are almost out.',
  },
  {
    id: 'pack_500',
    name: '+500 credits',
    credits: 500,
    amountIdr: 39_000,
    description: 'Best value mid-month boost.',
    badge: 'Best value',
  },
  {
    id: 'pack_2000',
    name: '+2.000 credits',
    credits: 2_000,
    amountIdr: 129_000,
    description: 'Heavy usage without changing plan.',
  },
];

export function getPlan(id: string): PlanDef | undefined {
  return PLANS.find((p) => p.id === id);
}

export function getPack(id: string): PackDef | undefined {
  return PACKS.find((p) => p.id === id);
}
