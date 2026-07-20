import {
  getPack,
  getPlan,
  PLAN_CTA,
  PLANS,
  PACKS,
  type PackId,
  type PlanId,
} from './catalog.js';

export type PaymentKind = 'plan' | 'credit_pack';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'expired';
export type SubStatus = 'active' | 'past_due' | 'canceled' | 'scheduled' | 'ended';

export interface Payment {
  id: string;
  kind: PaymentKind;
  planId?: PlanId;
  packId?: PackId;
  creditsGranted: number;
  amountIdr: number;
  status: PaymentStatus;
  /** Fake SumoPod-style checkout URL (simulate mode). */
  paymentUrl: string;
  createdAt: string;
  paidAt?: string;
  label: string;
}

export interface Invoice {
  id: string;
  number: string;
  amount: number;
  status: 'paid' | 'open' | 'void' | 'draft';
  issuedAt: string;
  paidAt?: string;
  kind: PaymentKind;
  label: string;
}

export interface DogfoodState {
  customerId: string;
  customerName: string;
  customerEmail: string;
  /** Active plan (free counts as plan). */
  planId: PlanId;
  subscriptionId: string;
  subscriptionStatus: SubStatus;
  interval: 'month' | 'year';
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string;
  /** Credits used this period (against plan allowance). */
  creditsUsed: number;
  /** Bonus credits from packs (spend plan allowance first, then bonus). */
  bonusCredits: number;
  payments: Payment[];
  invoices: Invoice[];
  /** Last payment callout for banner. */
  callout: {
    status: 'pending' | 'success' | 'failed' | 'past_due';
    title?: string;
    description?: string;
  } | null;
  paymentMode: 'simulate' | 'live';
  activity: Array<{ at: string; message: string }>;
}

let seq = 1;
function nextId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${seq++}`;
}

function periodEnd(days = 30): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function baseState(): DogfoodState {
  return {
    customerId: 'cus_demo_acme',
    customerName: 'Ayu Demo',
    customerEmail: 'ayu@acme-ai.dev',
    planId: 'free',
    subscriptionId: 'sub_demo_free',
    subscriptionStatus: 'active',
    interval: 'month',
    cancelAtPeriodEnd: false,
    currentPeriodEnd: periodEnd(30),
    creditsUsed: 12,
    bonusCredits: 0,
    payments: [],
    invoices: [],
    callout: {
      status: 'pending',
      title: 'Welcome to Acme AI',
      description: 'Dogfood dashboard — buy a plan or top up credits. Helpers on the right.',
    },
    paymentMode: 'simulate',
    activity: [{ at: new Date().toISOString(), message: 'Seeded Free plan (100 credits/mo)' }],
  };
}

let state: DogfoodState = baseState();

function pushActivity(message: string) {
  state.activity.unshift({ at: new Date().toISOString(), message });
  state.activity = state.activity.slice(0, 40);
}

/** Effective balance = plan remaining + bonus. */
export function creditBalance(s: DogfoodState = state) {
  const plan = getPlan(s.planId)!;
  const planRemaining = Math.max(0, plan.creditsPerPeriod - s.creditsUsed);
  const total = planRemaining + s.bonusCredits;
  const limit = plan.creditsPerPeriod + s.bonusCredits;
  const used = plan.creditsPerPeriod - planRemaining + (limit - planRemaining - s.bonusCredits);
  // used display: how much of (plan+bonus pool) consumed
  const poolLimit = plan.creditsPerPeriod + s.bonusCredits;
  const poolUsed = Math.max(0, poolLimit - total);
  return {
    planAllowance: plan.creditsPerPeriod,
    planUsed: s.creditsUsed,
    planRemaining,
    bonusCredits: s.bonusCredits,
    totalRemaining: total,
    poolLimit,
    poolUsed,
  };
}

export function getSnapshot() {
  const plan = getPlan(state.planId)!;
  const bal = creditBalance();
  return {
    ...state,
    catalog: {
      plans: PLANS.map((p) => ({
        ...p,
        currency: 'IDR',
        ctaLabel: PLAN_CTA[p.id],
      })),
      packs: PACKS,
    },
    credits: bal,
    plan,
    views: {
      subscription: {
        id: state.subscriptionId,
        planId: state.planId,
        planName: plan.name,
        status: state.subscriptionStatus,
        interval: state.interval,
        nextAmount: state.interval === 'year' ? plan.yearlyAmount : plan.monthlyAmount,
        currency: 'IDR',
        currentPeriodEnd: state.currentPeriodEnd,
        paymentMethodLabel: 'SumoPod QRIS',
        cancelAtPeriodEnd: state.cancelAtPeriodEnd,
      },
      entitlement: {
        featureId: 'ai_credits',
        label: 'AI credits',
        used: bal.poolUsed,
        limit: bal.poolLimit,
        resetLabel: 'Resets with billing period',
        unit: 'credits',
      },
      entitlements: [
        {
          featureId: 'ai_credits',
          label: 'AI credits',
          used: bal.poolUsed,
          limit: bal.poolLimit,
          resetLabel: 'Resets with billing period',
          unit: 'credits',
        },
      ],
      plans: PLANS.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        monthlyAmount: p.monthlyAmount,
        yearlyAmount: p.yearlyAmount,
        currency: 'IDR',
        recommended: p.recommended,
        badge: p.badge,
        features: p.features,
        ctaLabel: PLAN_CTA[p.id],
      })),
      invoices: state.invoices.map((inv) => ({
        id: inv.id,
        number: inv.number,
        amount: inv.amount,
        currency: 'IDR',
        status: inv.status,
        issuedAt: inv.issuedAt,
        paidAt: inv.paidAt ?? null,
      })),
      callout: state.callout,
    },
  };
}

export type SeedTemplate = 'empty_free' | 'active_starter' | 'low_credits' | 'pro_heavy';

export function seed(template: SeedTemplate) {
  state = baseState();
  if (template === 'empty_free') {
    state.creditsUsed = 0;
    state.bonusCredits = 0;
    state.callout = {
      status: 'pending',
      title: 'Fresh Free account',
      description: '100 credits/month. Buy Starter or a credit pack when ready.',
    };
    pushActivity('Template: empty Free');
  } else if (template === 'active_starter') {
    state.planId = 'starter';
    state.subscriptionId = nextId('sub');
    state.creditsUsed = 220;
    state.bonusCredits = 0;
    state.callout = {
      status: 'success',
      title: 'Starter active',
      description: '1.000 credits/month · SumoPod QRIS on file (simulated).',
    };
    state.invoices.unshift({
      id: nextId('inv'),
      number: 'INV-1001',
      amount: 49_000,
      status: 'paid',
      issuedAt: new Date(Date.now() - 3 * 864e5).toISOString(),
      paidAt: new Date(Date.now() - 3 * 864e5).toISOString(),
      kind: 'plan',
      label: 'Starter monthly',
    });
    pushActivity('Template: Active Starter (220/1000 used)');
  } else if (template === 'low_credits') {
    state.planId = 'starter';
    state.subscriptionId = nextId('sub');
    state.creditsUsed = 960;
    state.bonusCredits = 20;
    state.callout = {
      status: 'pending',
      title: 'Credits running low',
      description: 'Top up a pack or upgrade to Pro before jobs fail.',
    };
    pushActivity('Template: low credits (almost empty)');
  } else if (template === 'pro_heavy') {
    state.planId = 'pro';
    state.subscriptionId = nextId('sub');
    state.creditsUsed = 4_200;
    state.bonusCredits = 500;
    state.callout = {
      status: 'success',
      title: 'Pro + bonus pack',
      description: 'Plan allowance + leftover top-up credits.',
    };
    state.invoices.unshift(
      {
        id: nextId('inv'),
        number: 'INV-2001',
        amount: 199_000,
        status: 'paid',
        issuedAt: new Date(Date.now() - 10 * 864e5).toISOString(),
        paidAt: new Date(Date.now() - 10 * 864e5).toISOString(),
        kind: 'plan',
        label: 'Pro monthly',
      },
      {
        id: nextId('inv'),
        number: 'INV-2002',
        amount: 39_000,
        status: 'paid',
        issuedAt: new Date(Date.now() - 2 * 864e5).toISOString(),
        paidAt: new Date(Date.now() - 2 * 864e5).toISOString(),
        kind: 'credit_pack',
        label: '+500 credits pack',
      },
    );
    pushActivity('Template: Pro heavy usage');
  }
  return getSnapshot();
}

export function setPaymentMode(mode: 'simulate' | 'live') {
  state.paymentMode = mode;
  pushActivity(`Payment mode → ${mode}`);
  return getSnapshot();
}

export function burnCredits(amount: number) {
  const n = Math.max(0, Math.floor(amount));
  if (n <= 0) return getSnapshot();
  const bal = creditBalance();
  if (bal.totalRemaining <= 0) {
    state.callout = {
      status: 'failed',
      title: 'Out of credits',
      description: 'Buy a credit pack or upgrade your plan.',
    };
    pushActivity('Burn blocked — 0 credits');
    return getSnapshot();
  }
  let left = Math.min(n, bal.totalRemaining);
  // Spend plan remaining first (increase creditsUsed), then bonus
  const plan = getPlan(state.planId)!;
  const planRem = Math.max(0, plan.creditsPerPeriod - state.creditsUsed);
  const fromPlan = Math.min(left, planRem);
  state.creditsUsed += fromPlan;
  left -= fromPlan;
  if (left > 0) {
    state.bonusCredits = Math.max(0, state.bonusCredits - left);
  }
  const burned = Math.min(n, bal.totalRemaining);
  pushActivity(`Burned ${burned} AI credits`);
  const after = creditBalance();
  if (after.totalRemaining === 0) {
    state.callout = {
      status: 'failed',
      title: 'Credits exhausted',
      description: 'Top up or upgrade to keep generating.',
    };
  } else if (after.totalRemaining < 100) {
    state.callout = {
      status: 'pending',
      title: 'Low balance',
      description: `${after.totalRemaining} credits left this period.`,
    };
  }
  return getSnapshot();
}

export function grantBonus(amount: number) {
  const n = Math.max(0, Math.floor(amount));
  state.bonusCredits += n;
  pushActivity(`Granted +${n} bonus credits`);
  return getSnapshot();
}

export function resetPeriod() {
  state.creditsUsed = 0;
  // keep bonus
  state.currentPeriodEnd = periodEnd(30);
  pushActivity('Billing period reset (plan allowance refilled)');
  state.callout = {
    status: 'pending',
    title: 'New period',
    description: 'Plan credits refilled. Bonus packs kept.',
  };
  return getSnapshot();
}

function createPendingPayment(input: {
  kind: PaymentKind;
  planId?: PlanId;
  packId?: PackId;
  creditsGranted: number;
  amountIdr: number;
  label: string;
}): Payment {
  const id = nextId('pay');
  const payment: Payment = {
    id,
    kind: input.kind,
    planId: input.planId,
    packId: input.packId,
    creditsGranted: input.creditsGranted,
    amountIdr: input.amountIdr,
    status: 'pending',
    paymentUrl: `https://pay.sumopod.example/qris/${id}`,
    createdAt: new Date().toISOString(),
    label: input.label,
  };
  state.payments.unshift(payment);
  state.callout = {
    status: 'pending',
    title: 'QRIS payment pending',
    description:
      state.paymentMode === 'simulate'
        ? `${input.label} · use Helpers → Simulate paid`
        : `${input.label} · open payment link (live SumoPod)`,
  };
  pushActivity(`Payment created: ${input.label} (Rp ${input.amountIdr.toLocaleString('id-ID')})`);
  return payment;
}

export function buyPlan(planId: PlanId, interval: 'month' | 'year' = 'month') {
  const plan = getPlan(planId);
  if (!plan) throw new Error(`Unknown plan: ${planId}`);
  state.interval = interval;
  if (plan.monthlyAmount === 0) {
    // Free — instant
    state.planId = 'free';
    state.subscriptionStatus = 'active';
    state.subscriptionId = nextId('sub');
    state.creditsUsed = 0;
    state.cancelAtPeriodEnd = false;
    state.currentPeriodEnd = periodEnd(30);
    state.callout = {
      status: 'success',
      title: 'On Free plan',
      description: '100 AI credits per month.',
    };
    pushActivity('Switched to Free (no payment)');
    return { payment: null, snapshot: getSnapshot() };
  }
  const amount = interval === 'year' ? plan.yearlyAmount : plan.monthlyAmount;
  const payment = createPendingPayment({
    kind: 'plan',
    planId,
    creditsGranted: plan.creditsPerPeriod,
    amountIdr: amount,
    label: `${plan.name} (${interval})`,
  });
  // Mark subscription scheduled until paid
  state.subscriptionStatus = 'scheduled';
  return { payment, snapshot: getSnapshot() };
}

export function buyPack(packId: PackId) {
  const pack = getPack(packId);
  if (!pack) throw new Error(`Unknown pack: ${packId}`);
  const payment = createPendingPayment({
    kind: 'credit_pack',
    packId,
    creditsGranted: pack.credits,
    amountIdr: pack.amountIdr,
    label: pack.name,
  });
  return { payment, snapshot: getSnapshot() };
}

export function simulatePayment(paymentId: string, outcome: 'paid' | 'failed' | 'expired') {
  const payment = state.payments.find((p) => p.id === paymentId);
  if (!payment) throw new Error('Payment not found');
  if (payment.status !== 'pending') throw new Error('Payment already finalized');

  payment.status = outcome;
  if (outcome === 'paid') {
    payment.paidAt = new Date().toISOString();
    if (payment.kind === 'plan' && payment.planId) {
      const plan = getPlan(payment.planId)!;
      state.planId = payment.planId;
      state.subscriptionId = nextId('sub');
      state.subscriptionStatus = 'active';
      state.creditsUsed = 0;
      state.cancelAtPeriodEnd = false;
      state.currentPeriodEnd = periodEnd(state.interval === 'year' ? 365 : 30);
      state.invoices.unshift({
        id: nextId('inv'),
        number: `INV-${1000 + state.invoices.length + 1}`,
        amount: payment.amountIdr,
        status: 'paid',
        issuedAt: payment.createdAt,
        paidAt: payment.paidAt,
        kind: 'plan',
        label: payment.label,
      });
      state.callout = {
        status: 'success',
        title: `${plan.name} activated`,
        description: `${plan.creditsPerPeriod.toLocaleString('id-ID')} AI credits this period.`,
      };
      pushActivity(`Plan paid: ${plan.name}`);
    } else if (payment.kind === 'credit_pack') {
      state.bonusCredits += payment.creditsGranted;
      state.invoices.unshift({
        id: nextId('inv'),
        number: `INV-${1000 + state.invoices.length + 1}`,
        amount: payment.amountIdr,
        status: 'paid',
        issuedAt: payment.createdAt,
        paidAt: payment.paidAt,
        kind: 'credit_pack',
        label: payment.label,
      });
      state.callout = {
        status: 'success',
        title: 'Credits added',
        description: `+${payment.creditsGranted.toLocaleString('id-ID')} credits on your balance.`,
      };
      pushActivity(`Pack paid: +${payment.creditsGranted} credits`);
    }
  } else {
    state.callout = {
      status: outcome === 'failed' ? 'failed' : 'pending',
      title: outcome === 'failed' ? 'Payment failed' : 'Payment expired',
      description: `${payment.label} · try again from Plans or Credits.`,
    };
    if (payment.kind === 'plan') {
      // revert scheduled
      state.subscriptionStatus = 'active';
    }
    pushActivity(`Payment ${outcome}: ${payment.label}`);
  }
  return getSnapshot();
}

export function cancelAtPeriodEnd(on: boolean) {
  state.cancelAtPeriodEnd = on;
  pushActivity(on ? 'Cancel scheduled at period end' : 'Cancel undone');
  state.callout = {
    status: 'pending',
    title: on ? 'Cancellation scheduled' : 'Plan continues',
    description: on
      ? `Access until ${new Date(state.currentPeriodEnd).toLocaleDateString('id-ID')}.`
      : 'Subscription remains active.',
  };
  return getSnapshot();
}

export function dismissCallout() {
  state.callout = null;
  return getSnapshot();
}
