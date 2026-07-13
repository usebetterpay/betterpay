/** Demo registry keys — shared by static params and client registry (no React). */
export const DEMO_NAMES = [
  'pricing-table',
  'plan-group',
  'plan-card',
  'plan-comparison',
  'subscription-summary',
  'plan-switcher',
  'cancel-flow',
  'billing-portal',
  'entitlement-meter',
  'usage-summary',
  'invoice-table',
  'invoice-card',
  'payment-status-banner',
] as const;

export type DemoName = (typeof DEMO_NAMES)[number];
