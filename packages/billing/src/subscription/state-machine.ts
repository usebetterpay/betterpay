// ── Subscription state machine ───────────────────────────────────────────

import type { SubscriptionStatus } from '../types';

/** Valid subscription state transitions. */
export const VALID_SUBSCRIPTION_TRANSITIONS: Record<SubscriptionStatus, SubscriptionStatus[]> = {
  scheduled: ['active', 'canceled'],
  active: ['past_due', 'canceled', 'ended'],
  past_due: ['active', 'canceled', 'ended'],
  canceled: [],
  ended: ['scheduled'], // Can re-subscribe via scheduled
};

/**
 * Check if a subscription state transition is valid.
 */
export function isValidSubscriptionTransition(
  from: SubscriptionStatus,
  to: SubscriptionStatus,
): boolean {
  return VALID_SUBSCRIPTION_TRANSITIONS[from]?.includes(to) ?? false;
}
