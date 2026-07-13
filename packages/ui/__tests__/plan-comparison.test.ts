import { describe, expect, it } from 'vitest';
import type { PlanView } from '../src/types/billing-ui';

// Mirror derive logic for unit coverage of matrix building without DOM.
function deriveFeatures(plans: PlanView[]) {
  const order: string[] = [];
  const labels = new Map<string, string>();
  for (const plan of plans) {
    for (const f of plan.features) {
      if (!labels.has(f.id)) {
        labels.set(f.id, f.label);
        order.push(f.id);
      }
    }
  }
  return order.map((id) => ({
    id,
    label: labels.get(id) ?? id,
    values: Object.fromEntries(
      plans.map((plan) => {
        const hit = plan.features.find((f) => f.id === id);
        if (!hit) return [plan.id, false] as const;
        return [plan.id, hit.included === false ? false : true] as const;
      }),
    ),
  }));
}

const plans: PlanView[] = [
  {
    id: 'free',
    name: 'Free',
    monthlyAmount: 0,
    yearlyAmount: 0,
    features: [
      { id: 'msg', label: 'Messages', included: true },
      { id: 'wa', label: 'WhatsApp', included: false },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    monthlyAmount: 199_000,
    yearlyAmount: 1_990_000,
    features: [
      { id: 'msg', label: 'Messages', included: true },
      { id: 'wa', label: 'WhatsApp', included: true },
      { id: 'sso', label: 'SSO', included: true },
    ],
  },
];

describe('plan comparison feature matrix', () => {
  it('unions features and marks missing as false', () => {
    const rows = deriveFeatures(plans);
    expect(rows.map((r) => r.id)).toEqual(['msg', 'wa', 'sso']);
    expect(rows[0].values.free).toBe(true);
    expect(rows[1].values.free).toBe(false);
    expect(rows[2].values.free).toBe(false);
    expect(rows[2].values.pro).toBe(true);
  });
});
