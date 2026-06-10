import { describe, it, expect } from 'vitest';
import { isValidSubscriptionTransition } from '../src/subscription/state-machine';

describe('Subscription state machine', () => {
  it('allows scheduled → active', () => {
    expect(isValidSubscriptionTransition('scheduled', 'active')).toBe(true);
  });

  it('allows scheduled → canceled', () => {
    expect(isValidSubscriptionTransition('scheduled', 'canceled')).toBe(true);
  });

  it('allows active → past_due', () => {
    expect(isValidSubscriptionTransition('active', 'past_due')).toBe(true);
  });

  it('allows active → canceled', () => {
    expect(isValidSubscriptionTransition('active', 'canceled')).toBe(true);
  });

  it('allows active → ended', () => {
    expect(isValidSubscriptionTransition('active', 'ended')).toBe(true);
  });

  it('allows past_due → active', () => {
    expect(isValidSubscriptionTransition('past_due', 'active')).toBe(true);
  });

  it('allows past_due → canceled', () => {
    expect(isValidSubscriptionTransition('past_due', 'canceled')).toBe(true);
  });

  it('allows ended → scheduled (re-subscribe)', () => {
    expect(isValidSubscriptionTransition('ended', 'scheduled')).toBe(true);
  });

  it('rejects canceled → active', () => {
    expect(isValidSubscriptionTransition('canceled', 'active')).toBe(false);
  });

  it('rejects canceled → ended', () => {
    expect(isValidSubscriptionTransition('canceled', 'ended')).toBe(false);
  });

  it('rejects active → scheduled', () => {
    expect(isValidSubscriptionTransition('active', 'scheduled')).toBe(false);
  });
});
