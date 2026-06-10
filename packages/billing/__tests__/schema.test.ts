import { describe, it, expect } from 'vitest';
import { feature, plan, isFeature, isPlan } from '../src/schema';

describe('feature()', () => {
  it('creates a boolean feature', () => {
    const aiModels = feature({ id: 'ai-models', type: 'boolean' });
    expect(aiModels.id).toBe('ai-models');
    expect(aiModels.type).toBe('boolean');
    expect(isFeature(aiModels)).toBe(true);
  });

  it('creates a metered feature', () => {
    const messages = feature({ id: 'messages', type: 'metered' });
    expect(messages.id).toBe('messages');
    expect(messages.type).toBe('metered');
  });

  it('calling a metered feature factory returns FeatureInclude', () => {
    const messages = feature({ id: 'messages', type: 'metered' });
    const include = messages({ limit: 5000, reset: 'month' });
    expect(include.featureId).toBe('messages');
    expect(include.type).toBe('metered');
    expect(include.metered).toEqual({ limit: 5000, reset: 'month' });
  });

  it('calling a boolean feature factory returns FeatureInclude without metered', () => {
    const aiModels = feature({ id: 'ai-models', type: 'boolean' });
    const include = aiModels();
    expect(include.featureId).toBe('ai-models');
    expect(include.type).toBe('boolean');
    expect(include.metered).toBeUndefined();
  });

  it('rejects invalid feature id', () => {
    expect(() => feature({ id: 'Invalid Id', type: 'boolean' })).toThrow();
    expect(() => feature({ id: '', type: 'boolean' })).toThrow();
    expect(() => feature({ id: '-starts-dash', type: 'boolean' })).toThrow();
  });

  it('rejects feature id > 64 chars', () => {
    expect(() => feature({ id: 'a'.repeat(65), type: 'boolean' })).toThrow();
  });

  it('accepts valid feature ids', () => {
    expect(() => feature({ id: 'my-feature', type: 'boolean' })).not.toThrow();
    expect(() => feature({ id: 'my_feature', type: 'boolean' })).not.toThrow();
    expect(() => feature({ id: 'feature123', type: 'metered' })).not.toThrow();
  });
});

describe('plan()', () => {
  it('creates a free plan', () => {
    const free = plan({
      id: 'free',
      group: 'base',
      default: true,
    });
    expect(free.id).toBe('free');
    expect(free.group).toBe('base');
    expect(free.default).toBe(true);
    expect(free.price).toBeUndefined();
    expect(isPlan(free)).toBe(true);
  });

  it('creates a paid plan with features', () => {
    const messages = feature({ id: 'messages', type: 'metered' });
    const aiModels = feature({ id: 'ai-models', type: 'boolean' });

    const pro = plan({
      id: 'pro',
      group: 'base',
      name: 'Pro Plan',
      price: { amount: 199000, currency: 'IDR', interval: 'month' },
      includes: [
        messages({ limit: 5000, reset: 'month' }),
        aiModels(),
      ],
    });

    expect(pro.id).toBe('pro');
    expect(pro.price?.amount).toBe(199000);
    expect(pro.includes).toHaveLength(2);
  });

  it('auto-derives name from id', () => {
    const p = plan({ id: 'pro-plan', group: 'base' });
    expect(p.name).toBe('Pro Plan');
  });

  it('accepts feature factories in includes and resolves them', () => {
    const messages = feature({ id: 'messages', type: 'metered' });
    const p = plan({
      id: 'test',
      group: 'base',
      includes: [messages],
    });
    expect(p.includes[0]!.featureId).toBe('messages');
  });

  it('rejects invalid plan id', () => {
    expect(() => plan({ id: 'INVALID', group: 'base' })).toThrow();
  });

  it('rejects negative price', () => {
    expect(() =>
      plan({
        id: 'test',
        group: 'base',
        price: { amount: -100, currency: 'IDR' },
      }),
    ).toThrow();
  });

  it('rejects price exceeding max', () => {
    expect(() =>
      plan({
        id: 'test',
        group: 'base',
        price: { amount: 1_000_000_000_000, currency: 'IDR' },
      }),
    ).toThrow();
  });
});

describe('isFeature / isPlan', () => {
  it('correctly identifies branded values', () => {
    const f = feature({ id: 'test', type: 'boolean' });
    const p = plan({ id: 'test', group: 'base' });
    expect(isFeature(f)).toBe(true);
    expect(isFeature(p)).toBe(false);
    expect(isPlan(p)).toBe(true);
    expect(isPlan(f)).toBe(false);
    expect(isFeature(null)).toBe(false);
    expect(isPlan(undefined)).toBe(false);
  });
});
